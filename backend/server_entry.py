import os
from flask_app_init import create_app

app = create_app()

if __name__ == "__main__":
    # When running in the Electron desktop shell, disable debug/reloader to avoid double-spawn.
    is_desktop = os.environ.get("PHARMACIAN_DESKTOP") == "1"
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=not is_desktop,
        use_reloader=not is_desktop
    )
