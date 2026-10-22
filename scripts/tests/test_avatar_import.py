"""Run with Pillow/NumPy available: python -m unittest scripts.tests.test_avatar_import."""
import importlib.util
import unittest
from pathlib import Path
import numpy as np

spec = importlib.util.spec_from_file_location('avatar_import', Path(__file__).resolve().parents[1] / 'avatar_import.py')
avatar_import = importlib.util.module_from_spec(spec)
spec.loader.exec_module(avatar_import)


class BackgroundImportTests(unittest.TestCase):
    def test_keys_magenta_and_keeps_white_sneakers(self):
        sheet = np.full((20, 20, 4), [255, 0, 255, 255], dtype=np.uint8)
        sheet[5:15, 5:15] = [255, 255, 255, 255]
        result = avatar_import.remove_flat_background(sheet)
        self.assertEqual(result[0, 0, 3], 0)
        np.testing.assert_array_equal(result[10, 10], [255, 255, 255, 255])

    def test_preserves_existing_transparency(self):
        sheet = np.full((10, 10, 4), [17, 29, 43, 255], dtype=np.uint8)
        sheet[0, 0, 3] = 0
        np.testing.assert_array_equal(avatar_import.remove_flat_background(sheet), sheet)

    def test_refuses_opaque_white_and_painted_backgrounds(self):
        for color in ([255, 255, 255, 255], [80, 60, 50, 255]):
            with self.assertRaisesRegex(ValueError, '#FF00FF'):
                avatar_import.remove_flat_background(np.full((10, 10, 4), color, dtype=np.uint8))


if __name__ == '__main__':
    unittest.main()
