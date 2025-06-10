import asyncio
import json
import pathlib
import sys
from typing import Optional

import uvicorn
from browser_use import Browser
from browser_use.browser.profile import BrowserProfile
from fastapi import FastAPI
from playwright.async_api import async_playwright

# Assuming views.py is correctly located for this import path
from workflow_use.recorder.views import (
	HttpRecordingStoppedEvent,
	HttpWorkflowUpdateEvent,
	RecorderEvent,
	WorkflowDefinitionSchema,  # This is the expected output type
)

# Path Configuration (should be identical to recorder.py if run from the same context)
SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
EXT_DIR = SCRIPT_DIR.parent.parent.parent / 'extension' / '.output' / 'chrome-mv3'
USER_DATA_DIR = SCRIPT_DIR / 'user_data_dir'

# 🔧 AuthManager integration for consistent Chrome usage with authentication
try:
	# Try to import AuthManager if available (when integrated with Glimpse)
	glimpse_api_path = SCRIPT_DIR.parent.parent.parent.parent / 'glimpse' / 'api'
	if glimpse_api_path.exists():
		sys.path.insert(0, str(glimpse_api_path.parent))
		from api.auth_manager import auth_manager
		USE_AUTH_MANAGER = True
		print(f"[Service] Using AuthManager for Chrome integration with authentication")
	else:
		USE_AUTH_MANAGER = False
		print(f"[Service] AuthManager not available, using default Chromium")
except ImportError:
	USE_AUTH_MANAGER = False
	print(f"[Service] AuthManager not available, using default Chromium")


class RecordingService:
	def __init__(self):
		self.event_queue: asyncio.Queue[RecorderEvent] = asyncio.Queue()
		self.last_workflow_update_event: Optional[HttpWorkflowUpdateEvent] = None
		self.browser: Browser

		self.final_workflow_output: Optional[WorkflowDefinitionSchema] = None
		self.recording_complete_event = asyncio.Event()
		self.final_workflow_processed_lock = asyncio.Lock()
		self.final_workflow_processed_flag = False

		self.app = FastAPI(title='Temporary Recording Event Server')
		self.app.add_api_route('/event', self._handle_event_post, methods=['POST'], status_code=202)
		# -- DEBUGGING --
		# Turn this on to debug requests
		# @self.app.middleware("http")
		# async def log_requests(request: Request, call_next):
		#     print(f"[Debug] Incoming request: {request.method} {request.url}")
		#     try:
		#         # Read request body
		#         body = await request.body()
		#         print(f"[Debug] Request body: {body.decode('utf-8', errors='replace')}")
		#         response = await call_next(request)
		#         print(f"[Debug] Response status: {response.status_code}")
		#         return response
		#     except Exception as e:
		#         print(f"[Error] Error processing request: {str(e)}")

		self.uvicorn_server_instance: Optional[uvicorn.Server] = None
		self.server_task: Optional[asyncio.Task] = None
		self.browser_task: Optional[asyncio.Task] = None
		self.event_processor_task: Optional[asyncio.Task] = None

	async def _handle_event_post(self, event_data: RecorderEvent):
		if isinstance(event_data, HttpWorkflowUpdateEvent):
			self.last_workflow_update_event = event_data
		await self.event_queue.put(event_data)
		return {'status': 'accepted', 'message': 'Event queued for processing'}

	async def _process_event_queue(self):
		print('[Service] Event processing task started.')
		try:
			while True:
				event = await self.event_queue.get()
				print(f'[Service] Event Received: {event.type}')
				if isinstance(event, HttpWorkflowUpdateEvent):
					# self.last_workflow_update_event is already updated in _handle_event_post
					pass
				elif isinstance(event, HttpRecordingStoppedEvent):
					print('[Service] RecordingStoppedEvent received, processing final workflow...')
					await self._capture_and_signal_final_workflow('RecordingStoppedEvent')
				self.event_queue.task_done()
		except asyncio.CancelledError:
			print('[Service] Event processing task cancelled.')
		except Exception as e:
			print(f'[Service] Error in event processing task: {e}')

	async def _capture_and_signal_final_workflow(self, trigger_reason: str):
		processed_this_call = False
		async with self.final_workflow_processed_lock:
			if not self.final_workflow_processed_flag:
				self.final_workflow_processed_flag = True  # Mark as processed to prevent race conditions
				processed_this_call = True
				if self.last_workflow_update_event:
					print(f'[Service] Capturing final workflow (Trigger: {trigger_reason}).')
					self.final_workflow_output = self.last_workflow_update_event.payload
				else:
					print(f'[Service] No workflow events recorded. Finalizing empty recording (Trigger: {trigger_reason}).')
					self.final_workflow_output = None

		if processed_this_call:
			print('[Service] Recording finalized. Setting recording_complete_event.')
			self.recording_complete_event.set()  # This will unblock the main capture_workflow method

			# If processing was due to a manual stop from the extension, try to close the browser
			if trigger_reason == 'RecordingStoppedEvent' and self.browser:
				print('[Service] Attempting to close browser due to RecordingStoppedEvent...')
				try:
					await self.browser.close()
					print('[Service] Browser close command issued.')
				except Exception as e_close:
					print(f'[Service] Error closing browser on recording stop: {e_close}')

	async def _launch_browser_and_wait(self):
		print(f'[Service] Attempting to load extension from: {EXT_DIR}')
		if not EXT_DIR.exists() or not EXT_DIR.is_dir():
			print(f'[Service] ERROR: Extension directory not found: {EXT_DIR}')
			self.recording_complete_event.set()  # Signal failure
			return

		try:
			# 🔧 Use AuthManager for Chrome integration if available
			if USE_AUTH_MANAGER:
				print(f'[Service] Using Chrome via AuthManager for workflow recording')
				
				# Get Chrome configuration from AuthManager
				profile_kwargs = auth_manager.get_browser_profile_kwargs()
				
				# Merge extension-specific args with Chrome configuration
				extension_args = [
					f'--disable-extensions-except={str(EXT_DIR.resolve())}',
					f'--load-extension={str(EXT_DIR.resolve())}',
				]
				
				# Combine args from AuthManager with extension args
				combined_args = profile_kwargs['args'] + extension_args
				
				# Create browser profile with Chrome + extensions + authentication
				# Include all auth_manager configuration except args (which we override)
				auth_config = {k: v for k, v in profile_kwargs.items() if k != 'args' and k != 'executable_path'}
				
				# The recording extension requires a persistent user data directory to function correctly.
				# We will use the one defined in the service, while still leveraging the storage_state from auth_manager.
				USER_DATA_DIR.mkdir(parents=True, exist_ok=True)
				print(f'[Service] Using persistent user data directory for extension: {USER_DATA_DIR.resolve()}')

				auth_config.update({
					'headless': False,
					'args': combined_args,
					'keep_alive': True,
					'user_data_dir': str(USER_DATA_DIR.resolve()),
				})
				
				profile = BrowserProfile(**auth_config)
				
				print(f'[Service] Recording will use {profile.channel} with saved authentication')
				print(f'[Service] Storage state loaded: {"storage_state" in auth_config}')
				print(f'[Service] Cookies file loaded: {"cookies_file" in auth_config}')
				print(f'[Service] Auth status: {auth_manager.get_auth_status()}')
				
			else:
				# Fallback to original Chromium behavior
				print(f'[Service] Using default Chromium for workflow recording')
				
				# Ensure user data dir exists
				USER_DATA_DIR.mkdir(parents=True, exist_ok=True)
				print(f'[Service] Using browser user data directory: {USER_DATA_DIR}')
				
				# Create browser profile with extension support (original behavior)
				profile = BrowserProfile(
					headless=False,
					user_data_dir=str(USER_DATA_DIR.resolve()),
					args=[
						f'--disable-extensions-except={str(EXT_DIR.resolve())}',
						f'--load-extension={str(EXT_DIR.resolve())}',
						'--no-default-browser-check',
						'--no-first-run',
					],
					keep_alive=True,
				)

			# Create and configure browser
			playwright = await async_playwright().start()
			self.browser = Browser(browser_profile=profile, playwright=playwright)

			print('[Service] Starting browser with extensions...')
			await self.browser.start()

			if not hasattr(self.browser, 'browser_context'):
				print("[Service] ERROR: Cannot find browser_context on Browser object.")
				self.recording_complete_event.set()
				return

			browser_closed_future = asyncio.Future()

			def on_browser_event(source: str):
				print(f'[Service] Browser event received: {source}')
				if not browser_closed_future.done():
					browser_closed_future.set_result(True)

			# Listen for the window/context being closed (clicking 'X')
			self.browser.browser_context.on('close', lambda: on_browser_event('context_closed'))

			# Listen for the entire browser process disconnecting (CMD+Q)
			if self.browser.browser_context.browser:
				self.browser.browser_context.browser.on('disconnected', lambda: on_browser_event('browser_disconnected'))
			else:
				print("[Service] WARNING: Could not attach 'disconnected' event handler (browser is None, likely a persistent context).")

			print('[Service] Browser launched. Waiting for user to close window or quit application...')
			await browser_closed_future
			print('[Service] Browser close/quit detected.')

		except asyncio.CancelledError:
			print('[Service] Browser task cancelled.')
			if self.browser:
				try:
					await self.browser.close()
				except:
					pass  # Best effort
			raise  # Re-raise to be caught by gather
		except Exception as e:
			print(f'[Service] Error in browser task: {e}')
		finally:
			print('[Service] Browser task finalization.')
			# self.browser = None
			# This call ensures that if browser is closed manually, we still try to capture.
			await self._capture_and_signal_final_workflow('BrowserTaskEnded')

	async def capture_workflow(self) -> Optional[WorkflowDefinitionSchema]:
		print('[Service] Starting capture_workflow session...')
		# Reset state for this session
		self.last_workflow_update_event = None
		self.final_workflow_output = None
		self.recording_complete_event.clear()
		self.final_workflow_processed_flag = False

		# Start background tasks
		self.event_processor_task = asyncio.create_task(self._process_event_queue())
		self.browser_task = asyncio.create_task(self._launch_browser_and_wait())

		# Configure and start Uvicorn server
		config = uvicorn.Config(self.app, host='127.0.0.1', port=7331, log_level='warning', loop='asyncio')
		self.uvicorn_server_instance = uvicorn.Server(config)
		self.server_task = asyncio.create_task(self.uvicorn_server_instance.serve())
		print('[Service] Uvicorn server task started.')

		try:
			print('[Service] Waiting for recording to complete...')
			await self.recording_complete_event.wait()
			print('[Service] Recording complete event received. Proceeding to cleanup.')
		except asyncio.CancelledError:
			print('[Service] capture_workflow task was cancelled externally.')
		finally:
			print('[Service] Starting cleanup phase...')

			# 1. Stop Uvicorn server
			if self.uvicorn_server_instance and self.server_task and not self.server_task.done():
				print('[Service] Signaling Uvicorn server to shut down...')
				self.uvicorn_server_instance.should_exit = True
				try:
					await asyncio.wait_for(self.server_task, timeout=5)  # Give server time to shut down
				except asyncio.TimeoutError:
					print('[Service] Uvicorn server shutdown timed out. Cancelling task.')
					self.server_task.cancel()
				except asyncio.CancelledError:  # If capture_workflow itself was cancelled
					pass
				except Exception as e_server_shutdown:
					print(f'[Service] Error during Uvicorn server shutdown: {e_server_shutdown}')

			# 2. Stop browser task (and ensure browser is closed)
			if self.browser_task and not self.browser_task.done():
				print('[Service] Cancelling browser task...')
				self.browser_task.cancel()
				try:
					await self.browser_task
				except asyncio.CancelledError:
					pass
				except Exception as e_browser_cancel:
					print(f'[Service] Error awaiting cancelled browser task: {e_browser_cancel}')

			if self.browser:  # Final check to close browser if still open
				print('[Service] Ensuring browser is closed in cleanup...')
				try:
					self.browser.browser_profile.keep_alive = False
					await self.browser.close()
					print('[Service] Browser closed successfully')
				except Exception as e_browser_close:
					print(f'[Service] Error closing browser in final cleanup: {e_browser_close}')
				
				# Also close playwright connection
				try:
					if hasattr(self.browser, 'playwright') and self.browser.playwright:
						await self.browser.playwright.stop()
						print('[Service] Playwright connection closed')
				except Exception as e_playwright:
					print(f'[Service] Error closing playwright: {e_playwright}')
				
				self.browser = None

			# 3. Stop event processor task
			if self.event_processor_task and not self.event_processor_task.done():
				print('[Service] Cancelling event processor task...')
				self.event_processor_task.cancel()
				try:
					await self.event_processor_task
				except asyncio.CancelledError:
					pass
				except Exception as e_ep_cancel:
					print(f'[Service] Error awaiting cancelled event processor task: {e_ep_cancel}')

			print('[Service] Cleanup phase complete.')

		if self.final_workflow_output:
			print('[Service] Returning captured workflow.')
		else:
			print('[Service] No workflow captured or an error occurred.')
		return self.final_workflow_output


async def main_service_runner():  # Example of how to run the service
	service = RecordingService()
	workflow_data = await service.capture_workflow()
	if workflow_data:
		print('\n--- CAPTURED WORKFLOW DATA (from main_service_runner) ---')
		# Assuming WorkflowDefinitionSchema has model_dump_json or similar
		try:
			print(workflow_data.model_dump_json(indent=2))
		except AttributeError:
			print(json.dumps(workflow_data, indent=2))  # Fallback for plain dicts if model_dump_json not present
		print('-----------------------------------------------------')
	else:
		print('No workflow data was captured by the service.')


if __name__ == '__main__':
	# This allows running service.py directly for testing
	try:
		asyncio.run(main_service_runner())
	except KeyboardInterrupt:
		print('Service runner interrupted by user.')
