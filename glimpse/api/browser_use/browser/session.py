from __future__ import annotations

import asyncio
import base64
import enum
import json
import logging
import os
import random
import re
import time
from dataclasses import dataclass
from functools import wraps
from pathlib import Path
from typing import Any, Dict, List, Optional, Self, Set, Tuple, cast, Union

import psutil
from playwright.async_api import (
	Browser as PlaywrightBrowser,
	BrowserContext as PlaywrightBrowserContext,
	ElementHandle,
	FrameLocator,
	Page,
	Playwright,
	TimeoutError,
	async_playwright,
)
from pydantic import BaseModel, ConfigDict, Field, InstanceOf, PrivateAttr, model_validator, AliasChoices
from pydantic.fields import FieldInfo
from playwright._impl._api_structures import ViewportSize

from browser_use.dom.views import DOMElementNode
from browser_use.browser.views import BrowserError, TabInfo, BrowserStateSummary
from browser_use.browser.profile import BrowserProfile, DEFAULT_BROWSER_PROFILE, get_display_size
from browser_use.dom.clickable_element_processor.service import ClickableElementProcessor
from browser_use.dom.service import DomService
from browser_use.dom.views import SelectorMap
from browser_use.exceptions import URLNotAllowedError
from browser_use.mouse.service import MouseMovementService
from browser_use.mouse.views import MouseMovementConfig, MouseMovementPattern
from browser_use.utils import time_execution_async, time_execution_sync

# Check if running in Docker
IN_DOCKER = os.environ.get('IN_DOCKER', 'false').lower()[0] in 'ty1'

logger = logging.getLogger('browser_use.browser.session')


_GLOB_WARNING_SHOWN = False  # used inside _is_url_allowed to avoid spamming the logs with the same warning multiple times


def truncate_url(s: str, max_len: int | None = None) -> str:
	"""Truncate/pretty-print a URL with a maximum length, removing the protocol and www. prefix"""
	s = s.replace('https://', '').replace('http://', '').replace('www.', '')
	if max_len is not None and len(s) > max_len:
		return s[:max_len] + '…'
	return s


def require_initialization(func):
	"""decorator for BrowserSession methods to require the BrowserSession be already active"""

	@wraps(func)
	def wrapper(self, *args, **kwargs):
		if not self.initialized:
			raise RuntimeError('BrowserSession(...).start() must be called first to launch or connect to the browser')
		if not self.agent_current_page or self.agent_current_page.is_closed():
			self.agent_current_page = self.browser_context.pages[0] if self.browser_context.pages else None

		if not self.agent_current_page or self.agent_current_page.is_closed():
			self.create_new_tab()
			assert self.agent_current_page and not self.agent_current_page.is_closed()

		if not hasattr(self, '_cached_browser_state_summary'):
			raise RuntimeError('BrowserSession(...).start() must be called first to initialize the browser session')

		return func(self, *args, **kwargs)

	return wrapper


DEFAULT_BROWSER_PROFILE = BrowserProfile()


@dataclass
class CachedClickableElementHashes:
	"""
	Clickable elements hashes for the last state
	"""

	url: str
	hashes: set[str]


class BrowserSession(BaseModel):
	"""
	Represents an active browser session with a running browser process somewhere.

	Chromium flags should be passed via extra_launch_args.
	Extra Playwright launch options (e.g., handle_sigterm, handle_sigint) can be passed as kwargs to BrowserSession and will be forwarded to the launch() call.
	"""

	model_config = ConfigDict(
		extra='allow',
		validate_assignment=False,
		revalidate_instances='always',
		frozen=False,
		arbitrary_types_allowed=True,
		populate_by_name=True,
	)
	# this class accepts arbitrary extra **kwargs in init because of the extra='allow' pydantic option
	# they are saved on the model, then applied to self.browser_profile via .apply_session_overrides_to_profile()

	# template profile for the BrowserSession, will be copied at init/validation time, and overrides applied to the copy
	browser_profile: InstanceOf[BrowserProfile] = Field(
		default=DEFAULT_BROWSER_PROFILE,
		description='BrowserProfile() instance containing config for the BrowserSession',
		validation_alias=AliasChoices('profile', 'config', 'new_context_config'),  # old names for this field, remove eventually
	)

	# runtime props/state: these can be passed in as props at init, or get auto-setup by BrowserSession.start()
	wss_url: str | None = Field(
		default=None,
		description='WSS URL of the node.js playwright browser server to connect to, outputted by (await chromium.launchServer()).wsEndpoint()',
	)
	cdp_url: str | None = Field(
		default=None,
		description='CDP URL of the browser to connect to, e.g. http://localhost:9222 or ws://127.0.0.1:9222/devtools/browser/387adf4c-243f-4051-a181-46798f4a46f4',
	)
	chrome_pid: int | None = Field(
		default=None, description='pid of the running chrome process to connect to on localhost (optional)'
	)
	playwright: Playwright | None = Field(
		default=None,
		description='Playwright library object returned by: await playwright.async_playwright().start()',
		exclude=True,
	)
	browser: InstanceOf[PlaywrightBrowser] | None = Field(
		default=None,
		description='playwright Browser object to use (optional)',
		validation_alias=AliasChoices('playwright_browser'),
		exclude=True,
	)
	browser_context: InstanceOf[PlaywrightBrowserContext] | None = Field(
		default=None,
		description='playwright BrowserContext object to use (optional)',
		validation_alias=AliasChoices('playwright_browser_context', 'context'),
		exclude=True,
	)
	initialized: bool = Field(
		default=False,
		description='Skip BrowserSession launch/connection setup entirely if True (not recommended)',
		validation_alias=AliasChoices('initialized', 'is_initialized'),
	)

	# runtime state: internally tracked attrs updated by BrowserSession class methods
	agent_current_page: InstanceOf[Page] | None = Field(  # mutated by self.create_new_tab(url)
		default=None,
		description='Foreground Page that the agent is focused on',
		validation_alias=AliasChoices('current_page', 'page'),
		exclude=True,
	)
	human_current_page: InstanceOf[Page] | None = Field(  # mutated by self.setup_foreground_tab_detection()
		default=None,
		description='Foreground Page that the human is focused on',
		exclude=True,
	)

	_cached_browser_state_summary: BrowserStateSummary | None = PrivateAttr(default=None)
	_cached_clickable_element_hashes: CachedClickableElementHashes | None = PrivateAttr(default=None)
	_mouse_movement_service: Optional[MouseMovementService] = PrivateAttr(default=None)

	@model_validator(mode='after')
	def apply_session_overrides_to_profile(self) -> Self:
		"""Apply any extra **kwargs passed to BrowserSession(...) as config overrides on top of browser_profile"""
		session_own_fields = type(self).model_fields.keys()

		# get all the extra BrowserProfile kwarg overrides passed to BrowserSession(...) that are not Fields on self
		overrides = self.model_dump(exclude=session_own_fields)

		# FOR REPL DEBUGGING ONLY, NEVER ALLOW CIRCULAR REFERENCES IN REAL CODE:
		# self.browser_profile._in_use_by_session = self

		# replace browser_profile with patched version
		self.browser_profile = self.browser_profile.model_copy(update=overrides)

		# FOR REPL DEBUGGING ONLY, NEVER ALLOW CIRCULAR REFERENCES IN REAL CODE:
		# self.browser_profile._in_use_by_session = self

		return self

	@model_validator(mode='after')
	def setup_mouse_movement_service(self) -> 'BrowserSession':
		"""Set up the mouse movement service based on the profile configuration."""
		if not hasattr(self, '_mouse_movement_service') or self._mouse_movement_service is None:
			# Create mouse movement config from browser profile settings
			mouse_config = MouseMovementConfig(
				enabled=self.browser_profile.use_human_like_mouse,
				pattern=MouseMovementPattern(self.browser_profile.mouse_movement_pattern),
				speed_variation=self.browser_profile.mouse_speed_variation,
				min_movement_time=self.browser_profile.min_mouse_movement_time,
				max_movement_time=self.browser_profile.max_mouse_movement_time,
				show_visual_cursor=self.browser_profile.show_visual_cursor,
			)
			logger.info(f"🖱️ Setting up mouse movement service with pattern={mouse_config.pattern.value}, enabled={mouse_config.enabled}, visual_cursor={mouse_config.show_visual_cursor}")
			
			self._mouse_movement_service = MouseMovementService(config=mouse_config)
		
		return self

	def start_click_recording(self, recording_dir: Optional[str] = None):
		"""Start recording click events during the session."""
		if hasattr(self, '_mouse_movement_service') and self._mouse_movement_service:
			self._mouse_movement_service.start_recording(recording_dir)
			logger.info(f"📹 Started click recording for session")
		else:
			logger.warning(f"📹 Cannot start click recording: mouse movement service not initialized")

	def stop_click_recording(self) -> List[dict]:
		"""Stop recording click events and return the recorded data."""
		if hasattr(self, '_mouse_movement_service') and self._mouse_movement_service:
			click_data = self._mouse_movement_service.stop_recording()
			logger.info(f"📹 Stopped click recording for session, recorded {len(click_data)} clicks")
			return click_data
		else:
			logger.warning(f"📹 Cannot stop click recording: mouse movement service not initialized")
			return []

	async def start(self) -> Self:
		# finish initializing/validate the browser_profile:
		assert isinstance(self.browser_profile, BrowserProfile)
		self.browser_profile.prepare_user_data_dir()  # create/unlock the <user_data_dir>/SingletonLock
		self.browser_profile.detect_display_configuration()  # adjusts config values, must come before launch/connect

		# launch/connect to the browser:
		# setup playwright library client, Browser, and BrowserContext objects
		await self.setup_playwright()
		await self.setup_browser_connection()  # connects to existing browser if available
		await self.setup_browser_context()  # creates a new context in existing browser or launches a new persistent context
		assert self.browser_context

		# resize the existing pages and set up foreground tab detection
		await self.setup_viewport_sizing()
		await self.setup_foreground_tab_detection()

		self.initialized = True

		return self

	async def stop(self) -> None:
		if not self.browser_profile.keep_alive:
			logger.info('🛑 Shutting down browser...')
			if self.browser_context:
				try:
					await self.browser_context.close()
				except Exception as e:
					logger.debug(f'❌ Error closing playwright BrowserContext {self.browser_context}: {type(e).__name__}: {e}')

			if self.browser:
				try:
					await self.browser.close()
				except Exception as e:
					logger.debug(f'❌ Error closing playwright Browser {self.browser}: {type(e).__name__}: {e}')

			# kill the chrome subprocess if we were the ones that started it
			if self.chrome_pid:
				try:
					psutil.Process(pid=self.chrome_pid).terminate()
				except Exception as e:
					if 'NoSuchProcess' not in type(e).__name__:
						logger.debug(f'❌ Error terminating chrome subprocess pid={self.chrome_pid}: {type(e).__name__}: {e}')

	async def close(self) -> None:
		"""Shortcut for self.stop()"""
		await self.stop()

	async def new_context(self, **kwargs):
		"""Create a new browser context with the given kwargs"""
		return self

	async def __aenter__(self) -> BrowserSession:
		await self.start()
		return self

	async def __aexit__(self, exc_type, exc_val, exc_tb):
		await self.stop()

	async def setup_playwright(self) -> None:
		"""Override to customize the set up of the playwright or patchright library object"""
		self.playwright = self.playwright or await async_playwright().start()

		# No longer needed without patchright support

		return self.playwright

	async def setup_browser_connection(self) -> None:
		"""Override to customize the set up of the connection to an existing browser"""

		# if process is provided, calcuclate its CDP URL by looking for --remote-debugging-port=... in the launch args
		if self.chrome_pid:
			chrome_process = psutil.Process(pid=self.chrome_pid)
			assert chrome_process.is_running(), 'Chrome process is not running'
			args = chrome_process.cmdline()
			debug_port = next((arg for arg in args if arg.startswith('--remote-debugging-port=')), '').split('=')[-1].strip()
			assert debug_port, (
				f'Could not connect because could not find --remote-debugging-port=... in chrome launch args: pid={self.chrome_pid} {args}'
			)
			# we could automatically relaunch the browser process with that arg added here, but they may have tabs open they dont want to lose
			self.cdp_url = self.cdp_url or f'http://localhost:{debug_port}/'
			logger.info(f'🌎 Connecting to existing chromium process: pid={self.chrome_pid} on {self.cdp_url}')

		if self.wss_url:
			logger.info(f'🌎 Connecting to remote chromium playwright node.js server over WSS: {self.wss_url}')
			self.browser = self.browser or await self.playwright.chromium.connect(
				self.wss_url,
				**self.browser_profile.kwargs_for_connect().model_dump(),
			)
			# dont default to closing the browser when the BrowserSession is over if we connect by WSS
			if self.browser_profile.keep_alive is None:
				self.browser_profile.keep_alive = True
		elif self.cdp_url:
			logger.info(f'🌎 Connecting to remote chromium browser over CDP: {self.cdp_url}')
			self.browser = self.browser or await self.playwright.chromium.connect_over_cdp(
				self.cdp_url,
				**self.browser_profile.kwargs_for_connect().model_dump(),
			)
			# dont default to closing the browser when the BrowserSession is over if we connect by CDP
			if self.browser_profile.keep_alive is None:
				self.browser_profile.keep_alive = True

		# self.browser may still be None at this point if we have no config implying we should connect to an existing browser
		# self.setup_browser_context() will be called next and if it finds self.browser is None, it will
		# launch a new browser+context all in one go using launch_persistent_context()

		return self.browser

	async def setup_browser_context(self) -> None:
		# if we have a browser_context but no browser, use the browser from the context
		if self.browser_context:
			logger.info(f'🌎 Using existing user-provided browser_context and browser: {self.browser_context}')
			self.browser = self.browser or self.browser_context.browser
			# dont default to closing the browser when the BrowserSession is over if we are passed an external browser
			if self.browser_profile.keep_alive is None:
				self.browser_profile.keep_alive = True

		current_process = psutil.Process(os.getpid())
		child_pids_before_launch = {child.pid for child in current_process.children(recursive=True)}

		# if we have a browser object but no browser_context, use the first context discovered or make a new one
		if self.browser and not self.browser_context:
			if self.browser.contexts:
				self.browser_context = self.browser.contexts[0]
				logger.info(f'🌎 Using first browser_context available in user-provided browser: {self.browser_context}')
			else:
				self.browser_context = await self.browser.new_context(
					**self.browser_profile.kwargs_for_new_context().model_dump()
				)
				storage_info = (
					f' + loaded storage_state={len(self.browser_profile.storage_state.cookies) if self.browser_profile.storage_state else 0} cookies'
					if self.browser_profile.storage_state
					else ''
				)
				logger.info(f'🌎 Created new empty browser_context in existing browser{storage_info}: {self.browser_context}')

		# if we still have no browser_context by now, launch a new local one using launch_persistent_context()
		if not self.browser_context:
			logger.info(
				f'🌎 Launching local {str(type(self.playwright).__module__).split(".")[0]} {self.browser_profile.channel.name.lower()} browser with user_data_dir={self.browser_profile.user_data_dir or "None (incognito)"}'
			)
			if not self.browser_profile.user_data_dir:
				# if no user_data_dir is provided, launch an incognito context with no persistent user_data_dir
				self.browser = self.browser or await self.playwright.chromium.launch(
					**self.browser_profile.kwargs_for_launch().model_dump()
				)
				self.browser_context = await self.browser.new_context(
					**self.browser_profile.kwargs_for_new_context().model_dump()
				)
			else:
				self.browser_profile.prepare_user_data_dir()

				# search for potentially conflicting local processes running on the same user_data_dir
				for proc in psutil.process_iter(['pid', 'cmdline']):
					if f'--user-data-dir={self.browser_profile.user_data_dir}' in (proc.info['cmdline'] or []):
						# suffix_num = str(self.browser_profile.user_data_dir).rsplit('.', 1)[-1] or '1'
						# suffix_num = int(suffix_num) if suffix_num.isdigit() else 1

						# dir_name = self.browser_profile.user_data_dir.name
						# incremented_name = dir_name.replace(f'.{suffix_num}', f'.{suffix_num + 1}')
						# fork_path = self.browser_profile.user_data_dir.parent / incremented_name

						# # keep incrementing the suffix_num until we find a path that doesn't exist
						# while fork_path.exists():
						# 	suffix_num += 1
						# 	fork_path = self.browser_profile.user_data_dir.parent / (
						# 		dir_name.rsplit('.', 1)[0] + f'.{suffix_num}'
						# 	)

						logger.warning(
							f'🚨 Found potentially conflicting Chrome process pid={proc.info["pid"]} already running with the same user_data_dir={self.browser_profile.user_data_dir}'
						)
						# use shutil to recursively copy the user_data_dir to a new location
						# shutil.copytree(
						# 	str(self.browser_profile.user_data_dir),
						# 	str(fork_path),
						# 	symlinks=True,
						# 	ignore_dangling_symlinks=True,
						# 	dirs_exist_ok=False,
						# )
						# self.browser_profile.user_data_dir = fork_path
						# self.browser_profile.prepare_user_data_dir()
						break

				# if a user_data_dir is provided, launch a persistent context with that user_data_dir
				self.browser_context = await self.playwright.chromium.launch_persistent_context(
					**self.browser_profile.kwargs_for_launch_persistent_context().model_dump()
				)
			self.browser = self.browser_context.browser or self.browser
			# ^ this can unfortunately be None ^ playwright does not give us a browser object when we use launch_persistent_context()

		# Detect any new child chrome processes that we might have launched above
		child_pids_after_launch = {child.pid for child in current_process.children(recursive=True)}
		new_child_pids = child_pids_after_launch - child_pids_before_launch
		new_child_procs = [psutil.Process(pid) for pid in new_child_pids]
		new_chrome_procs = [proc for proc in new_child_procs if 'Helper' not in proc.name() and proc.status() == 'running']
		if new_chrome_procs and not self.chrome_pid:
			self.chrome_pid = new_chrome_procs[0].pid
			logger.debug(f' ↳ Spawned chrome subprocess: pid={self.chrome_pid} {" ".join(new_chrome_procs[0].cmdline())}')
			# default to closing the browser ourselves when the BrowserSession is over if we launched it ourselves
			if self.browser_profile.keep_alive is None:
				self.browser_profile.keep_alive = False

		if self.browser:
			connection_method = 'CDP' if self.cdp_url else 'WSS' if self.wss_url else 'Local'
			assert self.browser.is_connected(), (
				f'Browser is not connected, did the browser process crash or get killed? (connection method: {connection_method})'
			)
			logger.debug(f'🌎 {connection_method} Browser connected: v{self.browser.version}')
		assert self.browser_context, f'BrowserContext {self.browser_context} is not set up'

		return self.browser_context

	async def setup_foreground_tab_detection(self) -> None:
		# Uses a combination of:
		# - visibilitychange events
		# - window focus/blur events
		# - pointermove events

		# This multi-method approach provides more reliable detection across browsers.

		# TODO: pester the playwright team to add a new event that fires when a headful tab is focused.
		# OR implement a browser-use chrome extension that acts as a bridge to the chrome.tabs API.

		#         - https://github.com/microsoft/playwright/issues/1290
		#         - https://github.com/microsoft/playwright/issues/2286
		#         - https://github.com/microsoft/playwright/issues/3570
		#         - https://github.com/microsoft/playwright/issues/13989

		# set up / detect foreground page
		pages = self.browser_context.pages
		foreground_page = None
		if pages:
			foreground_page = pages[0]
			logger.debug(
				f'📜 Found {len(pages)} existing pages in browser, agent will start focused on Tab [{pages.index(foreground_page)}]: {foreground_page.url}'
			)
		else:
			foreground_page = await self.browser_context.new_page()
			pages = [foreground_page]
			logger.debug('📄 Opened new page in empty fresh browser context...')

		self.agent_current_page = self.agent_current_page or foreground_page
		self.human_current_page = self.human_current_page or foreground_page

		def _BrowserUseonTabVisibilityChange(source):
			new_page = source['page']

			# Update human foreground tab state
			old_foreground = self.human_current_page
			old_tab_idx = self.browser_context.pages.index(old_foreground)
			self.human_current_page = new_page
			new_tab_idx = self.browser_context.pages.index(new_page)

			# Log before and after for debugging
			if old_foreground.url != new_page.url:
				logger.info(
					f'👁️ Foregound tab changed by human from [{old_tab_idx}]{truncate_url(old_foreground.url, 22) if old_foreground else "about:blank"} '
					f'➡️ [{new_tab_idx}]{truncate_url(new_page.url, 22)} '
					f'(agent will stay on [{self.browser_context.pages.index(self.agent_current_page)}]{truncate_url(self.agent_current_page.url, 22)})'
				)
			return new_page.url

		await self.browser_context.expose_binding('_BrowserUseonTabVisibilityChange', _BrowserUseonTabVisibilityChange)
		update_tab_focus_script = """
			// --- Method 1: visibilitychange event (unfortunately *all* tabs are always marked visible by playwright, usually does not fire) ---
			document.addEventListener('visibilitychange', async () => {
				if (document.visibilityState === 'visible') {
					await window._BrowserUseonTabVisibilityChange({ source: 'visibilitychange', url: document.location.href });
					console.log('BrowserUse Foreground tab change event fired', document.location.href);
				}
			});
			
			// --- Method 2: focus/blur events, most reliable method for headful browsers ---
			window.addEventListener('focus', async () => {
				await window._BrowserUseonTabVisibilityChange({ source: 'focus', url: document.location.href });
				console.log('BrowserUse Foreground tab change event fired', document.location.href);
			});
			
			// --- Method 3: pointermove events (may be fired by agent if we implement AI hover movements) ---
			// Use a throttled handler to avoid excessive calls
			// let lastMove = 0;
			// window.addEventListener('pointermove', async () => {
			// 	const now = Date.now();
			// 	if (now - lastMove > 1000) {  // Throttle to once per second
			// 		lastMove = now;
			// 		await window._BrowserUseonTabVisibilityChange({ source: 'pointermove', url: document.location.href });
			//      console.log('BrowserUse Foreground tab change event fired', document.location.href);
			// 	}
			// });
		"""
		await self.browser_context.add_init_script(update_tab_focus_script)

		# set the user agent to the one we want
		# Set up visibility listeners for all existing tabs
		for page in self.browser_context.pages:
			if not page.url.startswith('chrome-extension://') and not page.url.startswith('chrome://') and not page.is_closed():
				await page.evaluate(update_tab_focus_script)
				# logger.debug(f'👁️ Added visibility listener to existing tab: {page.url}')

	async def setup_viewport_sizing(self) -> None:
		"""Resize any existing page viewports to match the configured size"""

		if not self.browser_context.pages:
			return

		# First, set the viewport size on any existing pages
		viewport = self.browser_profile.viewport
		logger.debug(
			'📐 Setting up viewport options: '
			+ f'headless={self.browser_profile.headless} '
			+ (f'viewport={viewport["width"]}x{viewport["height"]}px ' if viewport else '(no viewport) ')
			+ (
				f'window={self.browser_profile.window_size["width"]}x{self.browser_profile.window_size["height"]}px '
				if self.browser_profile.window_size
				else '(no window) '
			)
			+ (
				f'screen={self.browser_profile.screen["width"]}x{self.browser_profile.screen["height"]}px '
				if self.browser_profile.screen
				else ''
			)
			+ f'is_mobile={self.browser_profile.is_mobile} '
			+ f'device_scale_factor={self.browser_profile.device_scale_factor or 1.0} '
			+ (f'color_scheme={self.browser_profile.color_scheme.value} ' if self.browser_profile.color_scheme else '')
			+ (f'locale={self.browser_profile.locale} ' if self.browser_profile.locale else '')
			+ (f'timezone_id={self.browser_profile.timezone_id} ' if self.browser_profile.timezone_id else '')
			+ (f'geolocation={self.browser_profile.geolocation} ' if self.browser_profile.geolocation else '')
		)
		if viewport:
			for page in self.browser_context.pages:
				await page.set_viewport_size(viewport)

	# --- Tab management ---
	async def get_current_page(self) -> Page:
		"""Get the current page + ensure it's not None / closed"""

		# get-or-create the browser_context if it's not already set up
		if not self.browser_context:
			await self.start()
			assert self.browser_context, 'BrowserContext is not set up'

		# if either focused page is closed, clear it so we dont use a dead object
		if (not self.human_current_page) or self.human_current_page.is_closed():
			self.human_current_page = None
		if (not self.agent_current_page) or self.agent_current_page.is_closed():
			self.agent_current_page = None

		# if either one is None, fallback to using the other one for both
		self.agent_current_page = self.agent_current_page or self.human_current_page or None
		self.human_current_page = self.human_current_page or self.agent_current_page or None

		if self.agent_current_page is None:
			# if both are still None, fallback to using the first open tab we can find
			if self.browser_context.pages:
				first_available_tab = self.browser_context.pages[0]
				self.agent_current_page = first_available_tab
				self.human_current_page = first_available_tab
			else:
				# if all tabs are closed, open a new one
				new_tab = await self.create_new_tab()
				self.agent_current_page = new_tab
				self.human_current_page = new_tab

		assert self.agent_current_page is not None
		assert self.human_current_page is not None

		return self.agent_current_page

	@property
	def tabs(self) -> list[Page]:
		if not self.browser_context:
			return []
		return list(self.browser_context.pages)

	@require_initialization
	async def new_tab(self, url: str | None = None) -> Page:
		return await self.create_new_tab(url=url)

	@require_initialization
	async def switch_tab(self, tab_index: int) -> Page:
		pages = self.browser_context.pages
		if not pages or tab_index >= len(pages):
			raise IndexError('Tab index out of range')
		page = pages[tab_index]
		self.agent_current_page = page

		return page

	@require_initialization
	async def wait_for_element(self, selector: str, timeout: int = 10000) -> None:
		page = await self.get_current_page()
		await page.wait_for_selector(selector, state='visible', timeout=timeout)

	@require_initialization
	@time_execution_async('--remove_highlights')
	async def remove_highlights(self):
		"""
		Removes all highlight overlays and labels created by the highlightElement function.
		Handles cases where the page might be closed or inaccessible.
		"""
		page = await self.get_current_page()
		try:
			await page.evaluate(
				"""
                try {
                    // Remove the highlight container and all its contents
                    const container = document.getElementById('playwright-highlight-container');
                    if (container) {
                        container.remove();
                    }

                    // Remove highlight attributes from elements
                    const highlightedElements = document.querySelectorAll('[browser-user-highlight-id^="playwright-highlight-"]');
                    highlightedElements.forEach(el => {
                        el.removeAttribute('browser-user-highlight-id');
                    });
                } catch (e) {
                    console.error('Failed to remove highlights:', e);
                }
                """
			)
		except Exception as e:
			logger.debug(f'⚠  Failed to remove highlights (this is usually ok): {type(e).__name__}: {e}')
			# Don't raise the error since this is not critical functionality

	@require_initialization
	async def get_dom_element_by_index(self, index: int) -> Any | None:
		"""Get DOM element by index."""
		selector_map = await self.get_selector_map()
		return selector_map.get(index)

	@time_execution_async('--input_text_element_node')
	async def _input_text_element_node(self, element_node: DOMElementNode, text: str):
		"""
		Input text into an element with proper error handling and state management.
		Handles different types of input fields and ensures proper element state before input.
		Includes human-like mouse movement if enabled.
		"""
		try:
			element_handle = await self.get_locate_element(element_node)

			if element_handle is None:
				raise BrowserError(f'Element: {repr(element_node)} not found')

			# Ensure element is ready for input
			try:
				await element_handle.wait_for_element_state('stable', timeout=1000)
				is_visible = await self._is_visible(element_handle)
				if is_visible:
					await element_handle.scroll_into_view_if_needed(timeout=1000)
			except Exception:
				pass

			# Get element properties to determine input method
			tag_handle = await element_handle.get_property('tagName')
			tag_name = (await tag_handle.json_value()).lower()
			is_contenteditable = await element_handle.get_property('isContentEditable')
			readonly_handle = await element_handle.get_property('readOnly')
			disabled_handle = await element_handle.get_property('disabled')

			readonly = await readonly_handle.json_value() if readonly_handle else False
			disabled = await disabled_handle.json_value() if disabled_handle else False

			page = await self.get_current_page()
			
			# Use human-like mouse movement if enabled
			if self.browser_profile.use_human_like_mouse:
				# Initialize mouse movement service if needed
				self.setup_mouse_movement_service()
				
				logger.info(f"🖱️ Using human-like mouse movement to position cursor in input element with tag={tag_name}")
				# Move mouse to element before clicking
				await self._mouse_movement_service.move_mouse_to_element(page, element_handle)
				
				# Small delay before clicking (like a human would)
				await asyncio.sleep(random.uniform(0.1, 0.3))
			
			# always click the element first to make sure it's in the focus
			await element_handle.click()
			await asyncio.sleep(0.1)

			try:
				if (await is_contenteditable.json_value() or tag_name == 'input') and not (readonly or disabled):
					await element_handle.evaluate('el => {el.textContent = ""; el.value = "";}')
					
					# Add human-like typing delays if enabled
					if self.browser_profile.use_human_like_mouse:
						logger.info(f"🖱️ Using human-like typing for {len(text)} characters with varied delays")
						# Type with varied delays between characters for realistic typing
						for char in text:
							await element_handle.type(char, delay=random.uniform(50, 150))
							await asyncio.sleep(random.uniform(0.01, 0.05))
					else:
						await element_handle.type(text, delay=5)
				else:
					await element_handle.fill(text)
			except Exception:
				# last resort fallback, assume it's already focused after we clicked on it,
				# just simulate keypresses on the entire page
				if self.browser_profile.use_human_like_mouse:
					logger.info(f"🖱️ Fallback: Using human-like typing directly on page for {len(text)} characters")
					# Type with varied delays between characters for realistic typing
					for char in text:
						await page.keyboard.type(char, delay=random.uniform(50, 150))
						await asyncio.sleep(random.uniform(0.01, 0.05))
				else:
					await page.keyboard.type(text)

		except Exception as e:
			logger.debug(f'❌  Failed to input text into element: {repr(element_node)}. Error: {str(e)}')
			raise BrowserError(f'Failed to input text into index {element_node.highlight_index}')

	@time_execution_async('--click_element_node')
	async def _click_element_node(self, element_node: DOMElementNode, click_delay: float = None, move_delay: float = None):
		"""
		Click an element with proper error handling and state management.
		Handles retries, waiting for element stability, and human-like mouse movements if enabled.
		"""
		try:
			logger.debug(f"🖱️ Clicking element: {repr(element_node)}")
			element_handle = await self.get_locate_element(element_node)

			if element_handle is None:
				raise BrowserError(f'Element: {repr(element_node)} not found')

			# Ensure element is ready
			try:
				await element_handle.wait_for_element_state('stable', timeout=1000)
				is_visible = await self._is_visible(element_handle)

				if not is_visible:
					raise BrowserError(f'Element: {repr(element_node)} is not visible')
			except Exception as e:
				logger.debug(f"Element state error: {e}")
				raise BrowserError(f'Element: {repr(element_node)} is not ready for click: {str(e)}')

			# Add visual cursor if enabled
			if hasattr(self, '_mouse_movement_service') and self._mouse_movement_service.config.show_visual_cursor:
				page = await self.get_current_page()
				await self._mouse_movement_service.create_visual_cursor(page)

			# Use human-like mouse movement if enabled
			if hasattr(self, '_mouse_movement_service') and self._mouse_movement_service.config.enabled:
				logger.debug(f"Using human-like mouse movement to click {repr(element_node)}")
				await self._click_with_mouse_movement(element_handle, click_delay, move_delay)
			else:
				logger.debug(f"Using standard click on {repr(element_node)}")
				await element_handle.click(delay=click_delay or 0)

			# Wait for any navigation or animations to complete
			try:
				await self.page_client.wait_for_load_state('networkidle', timeout=3000)
			except Exception as e:
				logger.debug(f"Wait for load state error (non-critical): {e}")

			return True
		except Exception as e:
			logger.error(f"Click error: {e}")
			raise BrowserError(f'Failed to click element: {repr(element_node)}: {str(e)}')

	@time_execution_async('--get_tabs_info')
	async def get_tabs_info(self) -> list[TabInfo]:
		"""Get information about all tabs"""

		tabs_info = []
		for page_id, page in enumerate(self.browser_context.pages):
			try:
				tab_info = TabInfo(page_id=page_id, url=page.url, title=await asyncio.wait_for(page.title(), timeout=1))
			except TimeoutError:
				# page.title() can hang forever on tabs that are crashed/disappeared/about:blank
				# we dont want to try automating those tabs because they will hang the whole script
				logger.debug('⚠  Failed to get tab info for tab #%s: %s (ignoring)', page_id, page.url)
				tab_info = TabInfo(page_id=page_id, url='about:blank', title='ignore this tab and do not use it')
			tabs_info.append(tab_info)

		return tabs_info

	@require_initialization
	async def close_tab(self, tab_index: int | None = None) -> None:
		pages = self.browser_context.pages
		if not pages:
			return

		if tab_index is None:
			# to tab_index passed, just close the current agent page
			page = await self.get_current_page()
		else:
			# otherwise close the tab at the given index
			page = pages[tab_index]

		await page.close()

		# reset the self.agent_current_page and self.human_current_page references to first available tab
		await self.get_current_page()

	# --- Page navigation ---
	@require_initialization
	async def navigate(self, url: str) -> None:
		if self.agent_current_page:
			await self.agent_current_page.goto(url)
		else:
			await self.create_new_tab(url)

	@require_initialization
	async def refresh(self) -> None:
		if self.agent_current_page and not self.agent_current_page.is_closed():
			await self.agent_current_page.reload()
		else:
			await self.create_new_tab()

	@require_initialization
	async def execute_javascript(self, script: str) -> Any:
		page = await self.get_current_page()
		return await page.evaluate(script)

	async def get_cookies(self) -> list[dict[str, Any]]:
		if self.browser_context:
			return await self.browser_context.cookies()
		return []

	async def save_cookies(self, path: Path | None = None) -> None:
		"""
		Save cookies to the specified path or the default cookies_file in the downloads_dir.
		"""
		if self.browser_context:
			cookies = await self.browser_context.cookies()
			out_path = path or self.browser_profile.cookies_file
			if out_path:
				# If out_path is not absolute, resolve relative to downloads_dir
				out_path = Path(out_path)
				if not out_path.is_absolute():
					out_path = Path(self.browser_profile.downloads_dir) / out_path
				out_path.parent.mkdir(parents=True, exist_ok=True)
				out_path.write_text(json.dumps(cookies, indent=4))  # TODO: replace with anyio asyncio or anyio write

	# @property
	# def browser_extension_pages(self) -> list[Page]:
	# 	if not self.browser_context:
	# 		return []
	# 	return [p for p in self.browser_context.pages if p.url.startswith('chrome-extension://')]

	# @property
	# def saved_downloads(self) -> list[Path]:
	# 	"""
	# 	Return a list of files in the downloads_dir.
	# 	"""
	# 	return list(Path(self.browser_profile.downloads_dir).glob('*'))

	async def _wait_for_stable_network(self):
		pending_requests = set()
		last_activity = asyncio.get_event_loop().time()

		page = await self.get_current_page()

		# Define relevant resource types and content types
		RELEVANT_RESOURCE_TYPES = {
			'document',
			'stylesheet',
			'image',
			'font',
			'script',
			'iframe',
		}

		RELEVANT_CONTENT_TYPES = {
			'text/html',
			'text/css',
			'application/javascript',
			'image/',
			'font/',
			'application/json',
		}

		# Additional patterns to filter out
		IGNORED_URL_PATTERNS = {
			# Analytics and tracking
			'analytics',
			'tracking',
			'telemetry',
			'beacon',
			'metrics',
			# Ad-related
			'doubleclick',
			'adsystem',
			'adserver',
			'advertising',
			# Social media widgets
			'facebook.com/plugins',
			'platform.twitter',
			'linkedin.com/embed',
			# Live chat and support
			'livechat',
			'zendesk',
			'intercom',
			'crisp.chat',
			'hotjar',
			# Push notifications
			'push-notifications',
			'onesignal',
			'pushwoosh',
			# Background sync/heartbeat
			'heartbeat',
			'ping',
			'alive',
			# WebRTC and streaming
			'webrtc',
			'rtmp://',
			'wss://',
			# Common CDNs for dynamic content
			'cloudfront.net',
			'fastly.net',
		}

		async def on_request(request):
			# Filter by resource type
			if request.resource_type not in RELEVANT_RESOURCE_TYPES:
				return

			# Filter out streaming, websocket, and other real-time requests
			if request.resource_type in {
				'websocket',
				'media',
				'eventsource',
				'manifest',
				'other',
			}:
				return

			# Filter out by URL patterns
			url = request.url.lower()
			if any(pattern in url for pattern in IGNORED_URL_PATTERNS):
				return

			# Filter out data URLs and blob URLs
			if url.startswith(('data:', 'blob:')):
				return

			# Filter out requests with certain headers
			headers = request.headers
			if headers.get('purpose') == 'prefetch' or headers.get('sec-fetch-dest') in [
				'video',
				'audio',
			]:
				return

			nonlocal last_activity
			pending_requests.add(request)
			last_activity = asyncio.get_event_loop().time()
			# logger.debug(f'Request started: {request.url} ({request.resource_type})')

		async def on_response(response):
			request = response.request
			if request not in pending_requests:
				return

			# Filter by content type if available
			content_type = response.headers.get('content-type', '').lower()

			# Skip if content type indicates streaming or real-time data
			if any(
				t in content_type
				for t in [
					'streaming',
					'video',
					'audio',
					'webm',
					'mp4',
					'event-stream',
					'websocket',
					'protobuf',
				]
			):
				pending_requests.remove(request)
				return

			# Only process relevant content types
			if not any(ct in content_type for ct in RELEVANT_CONTENT_TYPES):
				pending_requests.remove(request)
				return

			# Skip if response is too large (likely not essential for page load)
			content_length = response.headers.get('content-length')
			if content_length and int(content_length) > 5 * 1024 * 1024:  # 5MB
				pending_requests.remove(request)
				return

			nonlocal last_activity
			pending_requests.remove(request)
			last_activity = asyncio.get_event_loop().time()
			# logger.debug(f'Request resolved: {request.url} ({content_type})')

		# Attach event listeners
		page.on('request', on_request)
		page.on('response', on_response)

		try:
			# Wait for idle time
			start_time = asyncio.get_event_loop().time()
			while True:
				await asyncio.sleep(0.1)
				now = asyncio.get_event_loop().time()
				if (
					len(pending_requests) == 0
					and (now - last_activity) >= self.browser_profile.wait_for_network_idle_page_load_time
				):
					break
				if now - start_time > self.browser_profile.maximum_wait_page_load_time:
					logger.debug(
						f'Network timeout after {self.browser_profile.maximum_wait_page_load_time}s with {len(pending_requests)} '
						f'pending requests: {[r.url for r in pending_requests]}'
					)
					break

		finally:
			# Clean up event listeners
			page.remove_listener('request', on_request)
			page.remove_listener('response', on_response)

		logger.debug(f'⚖️  Network stabilized for {self.browser_profile.wait_for_network_idle_page_load_time} seconds')

	async def _wait_for_page_and_frames_load(self, timeout_overwrite: float | None = None):
		"""
		Ensures page is fully loaded before continuing.
		Waits for either network to be idle or minimum WAIT_TIME, whichever is longer.
		Also checks if the loaded URL is allowed.
		"""
		# Start timing
		start_time = time.time()

		# Wait for page load
		page = await self.get_current_page()
		try:
			await self._wait_for_stable_network()

			# Check if the loaded URL is allowed
			await self._check_and_handle_navigation(page)
		except URLNotAllowedError as e:
			raise e
		except Exception:
			logger.warning('⚠️  Page load failed, continuing...')
			pass

		# Calculate remaining time to meet minimum WAIT_TIME
		elapsed = time.time() - start_time
		remaining = max((timeout_overwrite or self.browser_profile.minimum_wait_page_load_time) - elapsed, 0)

		logger.debug(f'--Page loaded in {elapsed:.2f} seconds, waiting for additional {remaining:.2f} seconds')

		# Sleep remaining time if needed
		if remaining > 0:
			await asyncio.sleep(remaining)

	def _is_url_allowed(self, url: str) -> bool:
		"""
		Check if a URL is allowed based on the whitelist configuration.

		Supports glob patterns in allowed_domains:
		- *.example.com will match sub.example.com and example.com
		- *google.com will match google.com, agoogle.com, and www.google.com
		"""

		if not self.browser_profile.allowed_domains:
			return True

		def _show_glob_warning(domain: str, glob: str):
			global _GLOB_WARNING_SHOWN
			if not _GLOB_WARNING_SHOWN:
				logger.warning(
					# glob patterns are very easy to mess up and match too many domains by accident
					# e.g. if you only need to access gmail, don't use *.google.com because an attacker could convince the agent to visit a malicious doc
					# on docs.google.com/s/some/evil/doc to set up a prompt injection attack
					f"⚠️ Allowing agent to visit {domain} based on allowed_domains=['{glob}', ...]. Set allowed_domains=['{domain}', ...] explicitly to avoid matching too many domains!"
				)
				_GLOB_WARNING_SHOWN = True

		try:
			import fnmatch
			from urllib.parse import urlparse

			parsed_url = urlparse(url)

			# Special case: Allow 'about:blank' explicitly
			if url == 'about:blank' or parsed_url.scheme.lower() in ('chrome', 'brave', 'edge', 'chrome-extension'):
				return True

			# Extract only the hostname component (without auth credentials or port)
			# Hostname returns only the domain portion, ignoring username:password and port
			domain = parsed_url.hostname.lower() if parsed_url.hostname else ''

			if not domain:
				return False

			for allowed_domain in self.browser_profile.allowed_domains:
				allowed_domain = allowed_domain.lower()

				# Handle glob patterns
				if '*' in allowed_domain:
					# Special handling for *.domain.tld pattern to also match the bare domain
					if allowed_domain.startswith('*.'):
						# If pattern is *.example.com, also allow example.com (without subdomain)
						parent_domain = allowed_domain[2:]  # Remove the '*.' prefix
						if domain == parent_domain or fnmatch.fnmatch(domain, allowed_domain):
							_show_glob_warning(domain, allowed_domain)
							return True
					else:
						# For other glob patterns like *google.com
						if fnmatch.fnmatch(domain, allowed_domain):
							_show_glob_warning(domain, allowed_domain)
							return True
				else:
					# Standard matching (exact or subdomain)
					if domain == allowed_domain:
						return True

			return False
		except Exception as e:
			logger.error(f'⛔️  Error checking URL allowlist: {type(e).__name__}: {e}')
			return False

	async def _check_and_handle_navigation(self, page: Page) -> None:
		"""Check if current page URL is allowed and handle if not."""
		if not self._is_url_allowed(page.url):
			logger.warning(f'⛔️  Navigation to non-allowed URL detected: {page.url}')
			try:
				await self.go_back()
			except Exception as e:
				logger.error(f'⛔️  Failed to go back after detecting non-allowed URL: {str(e)}')
			raise URLNotAllowedError(f'Navigation to non-allowed URL: {page.url}')

	async def navigate_to(self, url: str):
		"""Navigate the agent's current tab to a URL"""
		if not self._is_url_allowed(url):
			raise BrowserError(f'Navigation to non-allowed URL: {url}')

		page = await self.get_current_page()
		await page.goto(url)
		await page.wait_for_load_state()

	async def refresh_page(self):
		"""Refresh the agent's current page"""

		page = await self.get_current_page()
		await page.reload()
		await page.wait_for_load_state()

	async def go_back(self):
		"""Navigate the agent's tab back in browser history"""
		try:
			# 10 ms timeout
			page = await self.get_current_page()
			await page.go_back(timeout=10, wait_until='domcontentloaded')

			# await self._wait_for_page_and_frames_load(timeout_overwrite=1.0)
		except Exception as e:
			# Continue even if its not fully loaded, because we wait later for the page to load
			logger.debug(f'⏮️  Error during go_back: {e}')

	async def go_forward(self):
		"""Navigate the agent's tab forward in browser history"""
		try:
			page = await self.get_current_page()
			await page.go_forward(timeout=10, wait_until='domcontentloaded')
		except Exception as e:
			# Continue even if its not fully loaded, because we wait later for the page to load
			logger.debug(f'⏭️  Error during go_forward: {e}')

	async def close_current_tab(self):
		"""Close the current tab that the agent is working with.

		This closes the tab that the agent is currently using (agent_current_page),
		not necessarily the tab that is visible to the user (human_current_page).
		If they are the same tab, both references will be updated.
		"""

		# Check if this is the foreground tab as well
		is_foreground = self.agent_current_page == self.human_current_page

		# Close the tab
		try:
			await self.agent_current_page.close()
		except Exception as e:
			logger.debug(f'⛔️  Error during close_current_tab: {e}')

		# Clear agent's reference to the closed tab
		self.agent_current_page = None

		# Clear foreground reference if needed
		if is_foreground:
			self.human_current_page = None

		# Switch to the first available tab if any exist
		if self.browser_context.pages:
			await self.switch_to_tab(0)
			# switch_to_tab already updates both tab references

		# Otherwise, the browser will be closed

	async def get_page_html(self) -> str:
		"""Get the HTML content of the agent's current page"""
		page = await self.get_current_page()
		return await page.content()

	async def get_page_structure(self) -> str:
		"""Get a debug view of the page structure including iframes"""
		debug_script = """(() => {
			function getPageStructure(element = document, depth = 0, maxDepth = 10) {
				if (depth >= maxDepth) return '';

				const indent = '  '.repeat(depth);
				let structure = '';

				// Skip certain elements that clutter the output
				const skipTags = new Set(['script', 'style', 'link', 'meta', 'noscript']);

				// Add current element info if it's not the document
				if (element !== document) {
					const tagName = element.tagName.toLowerCase();

					// Skip uninteresting elements
					if (skipTags.has(tagName)) return '';

					const id = element.id ? `#${element.id}` : '';
					const classes = element.className && typeof element.className === 'string' ?
						`.${element.className.split(' ').filter(c => c).join('.')}` : '';

					// Get additional useful attributes
					const attrs = [];
					if (element.getAttribute('role')) attrs.push(`role="${element.getAttribute('role')}"`);
					if (element.getAttribute('aria-label')) attrs.push(`aria-label="${element.getAttribute('aria-label')}"`);
					if (element.getAttribute('type')) attrs.push(`type="${element.getAttribute('type')}"`);
					if (element.getAttribute('name')) attrs.push(`name="${element.getAttribute('name')}"`);
					if (element.getAttribute('src')) {
						const src = element.getAttribute('src');
						attrs.push(`src="${src.substring(0, 50)}${src.length > 50 ? '...' : ''}"`);
					}

					// Add element info
					structure += `${indent}${tagName}${id}${classes}${attrs.length ? ' [' + attrs.join(', ') + ']' : ''}\\n`;

					// Handle iframes specially
					if (tagName === 'iframe') {
						try {
							const iframeDoc = element.contentDocument || element.contentWindow?.document;
							if (iframeDoc) {
								structure += `${indent}  [IFRAME CONTENT]:\\n`;
								structure += getPageStructure(iframeDoc, depth + 2, maxDepth);
							} else {
								structure += `${indent}  [IFRAME: No access - likely cross-origin]\\n`;
							}
						} catch (e) {
							structure += `${indent}  [IFRAME: Access denied - ${e.message}]\\n`;
						}
					}
				}

				// Get all child elements
				const children = element.children || element.childNodes;
				for (const child of children) {
					if (child.nodeType === 1) { // Element nodes only
						structure += getPageStructure(child, depth + 1, maxDepth);
					}
				}

				return structure;
			}

			return getPageStructure();
		})()"""

		page = await self.get_current_page()
		structure = await page.evaluate(debug_script)
		return structure

	@time_execution_sync('--get_state_summary')  # This decorator might need to be updated to handle async
	async def get_state_summary(self, cache_clickable_elements_hashes: bool) -> BrowserStateSummary:
		"""Get a summary of the current browser state

		This method builds a BrowserStateSummary object that captures the current state
		of the browser, including url, title, tabs, screenshot, and DOM tree.

		Parameters:
		-----------
		cache_clickable_elements_hashes: bool
			If True, cache the clickable elements hashes for the current state.
			This is used to calculate which elements are new to the LLM since the last message,
			which helps reduce token usage.
		"""
		await self._wait_for_page_and_frames_load()
		updated_state = await self._get_updated_state()

		# Find out which elements are new
		# Do this only if url has not changed
		if cache_clickable_elements_hashes:
			# if we are on the same url as the last state, we can use the cached hashes
			if self._cached_clickable_element_hashes and self._cached_clickable_element_hashes.url == updated_state.url:
				# Pointers, feel free to edit in place
				updated_state_clickable_elements = ClickableElementProcessor.get_clickable_elements(updated_state.element_tree)

				for dom_element in updated_state_clickable_elements:
					dom_element.is_new = (
						ClickableElementProcessor.hash_dom_element(dom_element)
						not in self._cached_clickable_element_hashes.hashes  # see which elements are new from the last state where we cached the hashes
					)
			# in any case, we need to cache the new hashes
			self._cached_clickable_element_hashes = CachedClickableElementHashes(
				url=updated_state.url,
				hashes=ClickableElementProcessor.get_clickable_elements_hashes(updated_state.element_tree),
			)

		assert updated_state
		self._cached_browser_state_summary = updated_state

		# Save cookies if a file is specified
		if self.browser_profile.cookies_file:
			asyncio.create_task(self.save_cookies())

		return self._cached_browser_state_summary

	async def _get_updated_state(self, focus_element: int = -1) -> BrowserStateSummary:
		"""Update and return state."""

		page = await self.get_current_page()

		# Check if current page is still valid, if not switch to another available page
		try:
			# Test if page is still accessible
			await page.evaluate('1')
		except Exception as e:
			logger.debug(f'👋  Current page is no longer accessible: {type(e).__name__}: {e}')
			raise BrowserError('Browser closed: no valid pages available')

		try:
			await self.remove_highlights()
			dom_service = DomService(page)
			content = await dom_service.get_clickable_elements(
				focus_element=focus_element,
				viewport_expansion=self.browser_profile.viewport_expansion,
				highlight_elements=self.browser_profile.highlight_elements,
			)

			tabs_info = await self.get_tabs_info()

			# Get all cross-origin iframes within the page and open them in new tabs
			# mark the titles of the new tabs so the LLM knows to check them for additional content
			# unfortunately too buggy for now, too many sites use invisible cross-origin iframes for ads, tracking, youtube videos, social media, etc.
			# and it distracts the bot by opening a lot of new tabs
			# iframe_urls = await dom_service.get_cross_origin_iframes()
			# outer_page = self.agent_current_page
			# for url in iframe_urls:
			# 	if url in [tab.url for tab in tabs_info]:
			# 		continue  # skip if the iframe if we already have it open in a tab
			# 	new_page_id = tabs_info[-1].page_id + 1
			# 	logger.debug(f'Opening cross-origin iframe in new tab #{new_page_id}: {url}')
			# 	await self.create_new_tab(url)
			# 	tabs_info.append(
			# 		TabInfo(
			# 			page_id=new_page_id,
			# 			url=url,
			# 			title=f'iFrame opened as new tab, treat as if embedded inside page {outer_page.url}: {page.url}',
			# 			parent_page_url=outer_page.url,
			# 		)
			# 	)

			screenshot_b64 = await self.take_screenshot()
			pixels_above, pixels_below = await self.get_scroll_info(page)

			self.browser_state_summary = BrowserStateSummary(
				element_tree=content.element_tree,
				selector_map=content.selector_map,
				url=page.url,
				title=await page.title(),
				tabs=tabs_info,
				screenshot=screenshot_b64,
				pixels_above=pixels_above,
				pixels_below=pixels_below,
			)

			return self.browser_state_summary
		except Exception as e:
			logger.error(f'❌  Failed to update state: {e}')
			# Return last known good state if available
			if hasattr(self, 'browser_state_summary'):
				return self.browser_state_summary
			raise

	# region - Browser Actions
	@time_execution_async('--take_screenshot')
	async def take_screenshot(self, full_page: bool = False) -> str:
		"""
		Returns a base64 encoded screenshot of the current page.
		"""

		# We no longer force tabs to the foreground as it disrupts user focus
		# await self.agent_current_page.bring_to_front()
		page = await self.get_current_page()
		await page.wait_for_load_state()

		screenshot = await self.agent_current_page.screenshot(
			full_page=full_page,
			animations='disabled',
			caret='initial',
		)

		screenshot_b64 = base64.b64encode(screenshot).decode('utf-8')

		# await self.remove_highlights()

		return screenshot_b64

	# endregion

	# region - User Actions

	@classmethod
	def _convert_simple_xpath_to_css_selector(cls, xpath: str) -> str:
		"""Converts simple XPath expressions to CSS selectors."""
		if not xpath:
			return ''

		# Remove leading slash if present
		xpath = xpath.lstrip('/')

		# Split into parts
		parts = xpath.split('/')
		css_parts = []

		for part in parts:
			if not part:
				continue

			# Handle custom elements with colons by escaping them
			if ':' in part and '[' not in part:
				base_part = part.replace(':', r'\:')
				css_parts.append(base_part)
				continue

			# Handle index notation [n]
			if '[' in part:
				base_part = part[: part.find('[')]
				# Handle custom elements with colons in the base part
				if ':' in base_part:
					base_part = base_part.replace(':', r'\:')
				index_part = part[part.find('[') :]

				# Handle multiple indices
				indices = [i.strip('[]') for i in index_part.split(']')[:-1]]

				for idx in indices:
					try:
						# Handle numeric indices
						if idx.isdigit():
							index = int(idx) - 1
							base_part += f':nth-of-type({index + 1})'
						# Handle last() function
						elif idx == 'last()':
							base_part += ':last-of-type'
						# Handle position() functions
						elif 'position()' in idx:
							if '>1' in idx:
								base_part += ':nth-of-type(n+2)'
					except ValueError:
						continue

				css_parts.append(base_part)
			else:
				css_parts.append(part)

		base_selector = ' > '.join(css_parts)
		return base_selector

	@classmethod
	@time_execution_sync('--enhanced_css_selector_for_element')
	def _enhanced_css_selector_for_element(cls, element: DOMElementNode, include_dynamic_attributes: bool = True) -> str:
		"""
		Creates a CSS selector for a DOM element, handling various edge cases and special characters.

		Args:
				element: The DOM element to create a selector for

		Returns:
				A valid CSS selector string
		"""
		try:
			# Get base selector from XPath
			css_selector = cls._convert_simple_xpath_to_css_selector(element.xpath)

			# Handle class attributes
			if 'class' in element.attributes and element.attributes['class'] and include_dynamic_attributes:
				# Define a regex pattern for valid class names in CSS
				valid_class_name_pattern = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_-]*$')

				# Iterate through the class attribute values
				classes = element.attributes['class'].split()
				for class_name in classes:
					# Skip empty class names
					if not class_name.strip():
						continue

					# Check if the class name is valid
					if valid_class_name_pattern.match(class_name):
						# Append the valid class name to the CSS selector
						css_selector += f'.{class_name}'
					else:
						# Skip invalid class names
						continue

			# Expanded set of safe attributes that are stable and useful for selection
			SAFE_ATTRIBUTES = {
				# Data attributes (if they're stable in your application)
				'id',
				# Standard HTML attributes
				'name',
				'type',
				'placeholder',
				# Accessibility attributes
				'aria-label',
				'aria-labelledby',
				'aria-describedby',
				'role',
				# Common form attributes
				'for',
				'autocomplete',
				'required',
				'readonly',
				# Media attributes
				'alt',
				'title',
				'src',
				# Custom stable attributes (add any application-specific ones)
				'href',
				'target',
			}

			if include_dynamic_attributes:
				dynamic_attributes = {
					'data-id',
					'data-qa',
					'data-cy',
					'data-testid',
				}
				SAFE_ATTRIBUTES.update(dynamic_attributes)

			# Handle other attributes
			for attribute, value in element.attributes.items():
				if attribute == 'class':
					continue

				# Skip invalid attribute names
				if not attribute.strip():
					continue

				if attribute not in SAFE_ATTRIBUTES:
					continue

				# Escape special characters in attribute names
				safe_attribute = attribute.replace(':', r'\:')

				# Handle different value cases
				if value == '':
					css_selector += f'[{safe_attribute}]'
				elif any(char in value for char in '"\'<>`\n\r\t'):
					# Use contains for values with special characters
					# For newline-containing text, only use the part before the newline
					if '\n' in value:
						value = value.split('\n')[0]
					# Regex-substitute *any* whitespace with a single space, then strip.
					collapsed_value = re.sub(r'\s+', ' ', value).strip()
					# Escape embedded double-quotes.
					safe_value = collapsed_value.replace('"', '\\"')
					css_selector += f'[{safe_attribute}*="{safe_value}"]'
				else:
					css_selector += f'[{safe_attribute}="{value}"]'

			return css_selector

		except Exception:
			# Fallback to a more basic selector if something goes wrong
			tag_name = element.tag_name or '*'
			return f"{tag_name}[highlight_index='{element.highlight_index}']"

	@time_execution_async('--is_visible')
	async def _is_visible(self, element: ElementHandle) -> bool:
		"""
		Checks if an element is visible on the page.
		We use our own implementation instead of relying solely on Playwright's is_visible() because
		of edge cases with CSS frameworks like Tailwind. When elements use Tailwind's 'hidden' class,
		the computed style may return display as '' (empty string) instead of 'none', causing Playwright
		to incorrectly consider hidden elements as visible. By additionally checking the bounding box
		dimensions, we catch elements that have zero width/height regardless of how they were hidden.
		"""
		is_hidden = await element.is_hidden()
		bbox = await element.bounding_box()

		return not is_hidden and bbox is not None and bbox['width'] > 0 and bbox['height'] > 0

	@time_execution_async('--get_locate_element')
	async def get_locate_element(self, element: DOMElementNode) -> ElementHandle | None:
		page = await self.get_current_page()
		current_frame = page

		# Start with the target element and collect all parents
		parents: list[DOMElementNode] = []
		current = element
		while current.parent is not None:
			parent = current.parent
			parents.append(parent)
			current = parent

		# Reverse the parents list to process from top to bottom
		parents.reverse()

		# Process all iframe parents in sequence
		iframes = [item for item in parents if item.tag_name == 'iframe']
		for parent in iframes:
			css_selector = self._enhanced_css_selector_for_element(
				parent,
				include_dynamic_attributes=self.browser_profile.include_dynamic_attributes,
			)
			current_frame = current_frame.frame_locator(css_selector)

		css_selector = self._enhanced_css_selector_for_element(
			element, include_dynamic_attributes=self.browser_profile.include_dynamic_attributes
		)

		try:
			if isinstance(current_frame, FrameLocator):
				element_handle = await current_frame.locator(css_selector).element_handle()
				return element_handle
			else:
				# Try to scroll into view if hidden
				element_handle = await current_frame.query_selector(css_selector)
				if element_handle:
					is_visible = await self._is_visible(element_handle)
					if is_visible:
						await element_handle.scroll_into_view_if_needed()
					return element_handle
				return None
		except Exception as e:
			logger.error(f'❌  Failed to locate element: {str(e)}')
			return None

	@time_execution_async('--get_locate_element_by_xpath')
	async def get_locate_element_by_xpath(self, xpath: str) -> ElementHandle | None:
		"""
		Locates an element on the page using the provided XPath.
		"""
		page = await self.get_current_page()

		try:
			# Use XPath to locate the element
			element_handle = await page.query_selector(f'xpath={xpath}')
			if element_handle:
				is_visible = await self._is_visible(element_handle)
				if is_visible:
					await element_handle.scroll_into_view_if_needed()
				return element_handle
			return None
		except Exception as e:
			logger.error(f'❌  Failed to locate element by XPath {xpath}: {str(e)}')
			return None

	@time_execution_async('--get_locate_element_by_css_selector')
	async def get_locate_element_by_css_selector(self, css_selector: str) -> ElementHandle | None:
		"""
		Locates an element on the page using the provided CSS selector.
		"""
		page = await self.get_current_page()

		try:
			# Use CSS selector to locate the element
			element_handle = await page.query_selector(css_selector)
			if element_handle:
				is_visible = await self._is_visible(element_handle)
				if is_visible:
					await element_handle.scroll_into_view_if_needed()
				return element_handle
			return None
		except Exception as e:
			logger.error(f'❌  Failed to locate element by CSS selector {css_selector}: {str(e)}')
			return None

	@time_execution_async('--get_locate_element_by_text')
	async def get_locate_element_by_text(
		self, text: str, nth: int | None = 0, element_type: str | None = None
	) -> ElementHandle | None:
		"""
		Locates an element on the page using the provided text.
		If `nth` is provided, it returns the nth matching element (0-based).
		If `element_type` is provided, filters by tag name (e.g., 'button', 'span').
		"""
		page = await self.get_current_page()
		try:
			# handle also specific element type or use any type.
			selector = f'{element_type or "*"}:text("{text}")'
			elements = await page.query_selector_all(selector)
			# considering only visible elements
			elements = [el for el in elements if await self._is_visible(el)]

			if not elements:
				logger.error(f"No visible element with text '{text}' found.")
				return None

			if nth is not None:
				if 0 <= nth < len(elements):
					element_handle = elements[nth]
				else:
					logger.error(f"Visible element with text '{text}' not found at index {nth}.")
					return None
			else:
				element_handle = elements[0]

			is_visible = await self._is_visible(element_handle)
			if is_visible:
				await element_handle.scroll_into_view_if_needed()
			return element_handle
		except Exception as e:
			logger.error(f"❌  Failed to locate element by text '{text}': {str(e)}")
			return None

	@require_initialization
	@time_execution_async('--input_text_element_node')
	async def _input_text_element_node(self, element_node: DOMElementNode, text: str):
		"""
		Input text into an element with proper error handling and state management.
		Handles different types of input fields and ensures proper element state before input.
		"""
		try:
			# Highlight before typing
			# if element_node.highlight_index is not None:
			# 	await self._update_state(focus_element=element_node.highlight_index)

			element_handle = await self.get_locate_element(element_node)

			if element_handle is None:
				raise BrowserError(f'Element: {repr(element_node)} not found')

			# Ensure element is ready for input
			try:
				await element_handle.wait_for_element_state('stable', timeout=1000)
				is_visible = await self._is_visible(element_handle)
				if is_visible:
					await element_handle.scroll_into_view_if_needed(timeout=1000)
			except Exception:
				pass

			# Get element properties to determine input method
			tag_handle = await element_handle.get_property('tagName')
			tag_name = (await tag_handle.json_value()).lower()
			is_contenteditable = await element_handle.get_property('isContentEditable')
			readonly_handle = await element_handle.get_property('readOnly')
			disabled_handle = await element_handle.get_property('disabled')

			readonly = await readonly_handle.json_value() if readonly_handle else False
			disabled = await disabled_handle.json_value() if disabled_handle else False

			# always click the element first to make sure it's in the focus
			await element_handle.click()
			await asyncio.sleep(0.1)

			try:
				if (await is_contenteditable.json_value() or tag_name == 'input') and not (readonly or disabled):
					await element_handle.evaluate('el => {el.textContent = ""; el.value = "";}')
					await element_handle.type(text, delay=5)
				else:
					await element_handle.fill(text)
			except Exception:
				# last resort fallback, assume it's already focused after we clicked on it,
				# just simulate keypresses on the entire page
				page = await self.get_current_page()
				await page.keyboard.type(text)

		except Exception as e:
			logger.debug(f'❌  Failed to input text into element: {repr(element_node)}. Error: {str(e)}')
			raise BrowserError(f'Failed to input text into index {element_node.highlight_index}')

	@require_initialization
	@time_execution_async('--switch_to_tab')
	async def switch_to_tab(self, page_id: int) -> Page:
		"""Switch to a specific tab by its page_id (aka tab index exposed to LLM)"""
		pages = self.browser_context.pages

		if page_id >= len(pages):
			raise BrowserError(f'No tab found with page_id: {page_id}')

		page = pages[page_id]

		# Check if the tab's URL is allowed before switching
		if not self._is_url_allowed(page.url):
			raise BrowserError(f'Cannot switch to tab with non-allowed URL: {page.url}')

		# Update both tab references - agent wants this tab, and it's now in the foreground
		self.agent_current_page = page
		self.human_current_page = page

		# Bring tab to front and wait for it to load
		await page.bring_to_front()
		await page.wait_for_load_state()

		# Set the viewport size for the tab
		if self.browser_profile.viewport:
			await page.set_viewport_size(self.browser_profile.viewport)

		return page

	@time_execution_async('--create_new_tab')
	async def create_new_tab(self, url: str | None = None) -> Page:
		"""Create a new tab and optionally navigate to a URL"""

		if url and not self._is_url_allowed(url):
			raise BrowserError(f'Cannot create new tab with non-allowed URL: {url}')

		new_page = await self.browser_context.new_page()

		# Update agent tab reference
		self.agent_current_page = new_page

		# Update human tab reference if there is no human tab yet
		if (not self.human_current_page) or self.human_current_page.is_closed():
			self.human_current_page = new_page

		await new_page.wait_for_load_state()

		# Set the viewport size for the new tab
		if self.browser_profile.viewport:
			await new_page.set_viewport_size(self.browser_profile.viewport)

		if url:
			await new_page.goto(url, wait_until='domcontentloaded', timeout=10000)
			await self._wait_for_page_and_frames_load(timeout_overwrite=1)

		assert self.human_current_page is not None
		assert self.agent_current_page is not None
		if url:
			assert self.agent_current_page.url == url
		else:
			assert self.agent_current_page.url == 'about:blank'

		return new_page

	# region - Helper methods for easier access to the DOM

	@require_initialization
	async def get_selector_map(self) -> SelectorMap:
		if self._cached_browser_state_summary is None:
			return {}
		return self._cached_browser_state_summary.selector_map

	@require_initialization
	async def get_element_by_index(self, index: int) -> ElementHandle | None:
		selector_map = await self.get_selector_map()
		element_handle = await self.get_locate_element(selector_map[index])
		return element_handle

	@require_initialization
	async def is_file_uploader(self, element_node: DOMElementNode, max_depth: int = 3, current_depth: int = 0) -> bool:
		"""Check if element or its children are file uploaders"""
		if current_depth > max_depth:
			return False

		# Check current element
		is_uploader = False

		if not isinstance(element_node, DOMElementNode):
			return False

		# Check for file input attributes
		if element_node.tag_name == 'input':
			is_uploader = element_node.attributes.get('type') == 'file' or element_node.attributes.get('accept') is not None

		if is_uploader:
			return True

		# Recursively check children
		if element_node.children and current_depth < max_depth:
			for child in element_node.children:
				if isinstance(child, DOMElementNode):
					if await self.is_file_uploader(child, max_depth, current_depth + 1):
						return True

		return False

	async def get_scroll_info(self, page: Page) -> tuple[int, int]:
		"""Get scroll position information for the current page."""
		scroll_y = await page.evaluate('window.scrollY')
		viewport_height = await page.evaluate('window.innerHeight')
		total_height = await page.evaluate('document.documentElement.scrollHeight')
		pixels_above = scroll_y
		pixels_below = total_height - (scroll_y + viewport_height)
		return pixels_above, pixels_below

	async def _scroll_container(self, pixels: int) -> None:
		"""Scroll the element that truly owns vertical scroll.Starts at the focused node ➜ climbs to the first big, scroll-enabled ancestor otherwise picks the first scrollable element or the root, then calls `element.scrollBy` (or `window.scrollBy` for the root) by the supplied pixel value."""

		# An element can *really* scroll if: overflow-y is auto|scroll|overlay, it has more content than fits, its own viewport is not a postage stamp (more than 50 % of window).
		SMART_SCROLL_JS = """(dy) => {
			const bigEnough = el => el.clientHeight >= window.innerHeight * 0.5;
			const canScroll = el =>
				el &&
				/(auto|scroll|overlay)/.test(getComputedStyle(el).overflowY) &&
				el.scrollHeight > el.clientHeight &&
				bigEnough(el);

			let el = document.activeElement;
			while (el && !canScroll(el) && el !== document.body) el = el.parentElement;

			el = canScroll(el)
					? el
					: [...document.querySelectorAll('*')].find(canScroll)
					|| document.scrollingElement
					|| document.documentElement;

			if (el === document.scrollingElement ||
				el === document.documentElement ||
				el === document.body) {
				window.scrollBy(0, dy);
			} else {
				el.scrollBy({ top: dy, behavior: 'auto' });
			}
		}"""
		page = await self.get_current_page()
		await page.evaluate(SMART_SCROLL_JS, pixels)

	@staticmethod
	async def _get_unique_filename(directory, filename):
		"""Generate a unique filename by appending (1), (2), etc., if a file already exists."""
		base, ext = os.path.splitext(filename)
		counter = 1
		new_filename = filename
		while os.path.exists(os.path.join(directory, new_filename)):
			new_filename = f'{base} ({counter}){ext}'
			counter += 1
		return new_filename

	async def _click_with_mouse_movement(self, element_handle, click_delay=None, move_delay=None):
		"""Use the mouse movement service to move to an element and click it."""
		# Simply delegate to the mouse service which handles all the movement and visual feedback
		await self._mouse_movement_service.click_element_with_movement(
			await self.get_current_page(), element_handle, click_delay=click_delay
		)
