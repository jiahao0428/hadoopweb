import sys
from RestrictedPython import compile_restricted
from RestrictedPython.PrintCollector import PrintCollector
from RestrictedPython.Guards import safe_builtins

data = open (sys.argv[1], "r").read()
src = data

_builtins = dict(__builtins__.__dict__)

def _hook_import(name, *args, **kwargs):
    if name == 'subprocess':    # now allow to import unsecure lib
        raise RuntimeError('cannot import lib')
    # otherwise, use default __import__
    return __import__(name, *args, **kwargs)
# replace __import__ with our hook implementation
_builtins['__import__'] = _hook_import


safe_builtins.update({'__import__': _builtins['__import__']})
safe_builtins.update({'_print_': _builtins['print']})
restricted_globals = dict(__builtins__ = safe_builtins)
code = compile(src, '<string>', 'exec')
exec(code) in restricted_globals
