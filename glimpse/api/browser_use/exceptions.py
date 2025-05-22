class LLMException(Exception):
	def __init__(self, status_code, message):
		self.status_code = status_code
		self.message = message
		super().__init__(f'Error {status_code}: {message}')


class URLNotAllowedError(Exception):
	"""Raised when a navigation attempt is made to a URL that is not in the allowed domains list."""
	pass
