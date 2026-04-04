import logging
import os


def setup_logging(base_dir):
    os.makedirs(os.path.join(base_dir, "logs"), exist_ok=True)
    logging.basicConfig(
        filename=os.path.join(base_dir, "logs", "app.log"),
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )
