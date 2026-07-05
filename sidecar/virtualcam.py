import sys

import numpy as np
import pyvirtualcam

DEFAULT_WIDTH = 1280
DEFAULT_HEIGHT = 720
DEFAULT_FPS = 30


def parse_args() -> tuple[int, int, int]:
    """Parse width, height, fps from argv. Defaults: 1280x720 @ 30fps."""
    width = DEFAULT_WIDTH
    height = DEFAULT_HEIGHT
    fps = DEFAULT_FPS

    if len(sys.argv) >= 3:
        try:
            width = int(sys.argv[1])
            height = int(sys.argv[2])
        except ValueError:
            sys.stderr.write(
                f'Invalid dimensions {sys.argv[1]}x{sys.argv[2]}; using {DEFAULT_WIDTH}x{DEFAULT_HEIGHT}.\n'
            )
            width = DEFAULT_WIDTH
            height = DEFAULT_HEIGHT

    if len(sys.argv) >= 4:
        try:
            fps = int(sys.argv[3])
        except ValueError:
            sys.stderr.write(f'Invalid fps {sys.argv[3]}; using {DEFAULT_FPS}.\n')
            fps = DEFAULT_FPS

    if width < 1 or height < 1:
        sys.stderr.write(f'Invalid dimensions {width}x{height}; using defaults.\n')
        width = DEFAULT_WIDTH
        height = DEFAULT_HEIGHT

    return width, height, fps


def open_camera(width: int, height: int, fps: int) -> pyvirtualcam.Camera:
    """Open the OBS virtual camera.

    Tries the canonical "OBS Virtual Camera" device first. If that exact name
    is not present (it differs on some systems, e.g. "OBS-Camera"), fall back to
    letting pyvirtualcam auto-select, which picks the first OBS device it finds.
    """
    try:
        return pyvirtualcam.Camera(
            width=width,
            height=height,
            fps=fps,
            device='OBS Virtual Camera',
            fmt=pyvirtualcam.PixelFormat.RGB,
        )
    except Exception as exc:  # noqa: BLE001 - report and retry without explicit device
        sys.stderr.write(f'Named OBS device unavailable ({exc}); trying default.\n')
        sys.stderr.flush()
        return pyvirtualcam.Camera(
            width=width,
            height=height,
            fps=fps,
            fmt=pyvirtualcam.PixelFormat.RGB,
        )


def main() -> None:
    width, height, fps = parse_args()
    frame_bytes = width * height * 3  # RGB

    try:
        cam = open_camera(width, height, fps)
    except Exception as exc:  # noqa: BLE001 - no OBS VirtualCam driver installed
        sys.stderr.write(f'Failed to start virtual camera: {exc}\n')
        sys.stderr.flush()
        sys.exit(1)

    with cam:
        sys.stderr.write('Virtual camera started\n')
        sys.stderr.write(f'Virtual camera device: {cam.device}\n')
        sys.stderr.write(f'Virtual camera dimensions: {width}x{height} @ {fps}fps\n')
        sys.stderr.flush()

        while True:
            raw = sys.stdin.buffer.read(frame_bytes)
            if len(raw) < frame_bytes:
                break  # stdin closed = Electron shut down the sidecar
            frame = np.frombuffer(raw, dtype=np.uint8).reshape((height, width, 3))
            cam.send(frame)
            cam.sleep_until_next_frame()


if __name__ == '__main__':
    main()
