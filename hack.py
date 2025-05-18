import base64
import re
import struct

def bitmap_extraction(base64_string):
    try:
        # Decode base64
        bmp_data = base64.b64decode(base64_string)
        
        # Validate BMP
        if len(bmp_data) < 54 or bmp_data[:2] != b'BM':
            return 0
        
        # Parse header
        pixel_offset = struct.unpack('<I', bmp_data[10:14])[0]
        width = struct.unpack('<i', bmp_data[18:22])[0]
        height = struct.unpack('<i', bmp_data[22:26])[0]
        bits_per_pixel = struct.unpack('<H', bmp_data[28:30])[0]
        
        if bits_per_pixel != 24:
            return 0
        
        # Method 1: Raw bytes (works for example BMP)
        raw_string = ''.join(chr(b) for b in bmp_data if 32 <= b <= 126)
        match = re.search(r'ABC\{(\d+)\}', raw_string)
        if match:
            return int(match.group(1))
        
        # Method 2: Red channel with transformations
        row_size = ((width * 3 + 3) // 4) * 4
        pixel_data = bmp_data[pixel_offset:]
        red_values = []
        
        for y in range(height):
            row_start = y * row_size
            for x in range(width):
                pixel_idx = row_start + x * 3
                if pixel_idx + 2 < len(pixel_data):
                    red_values.append(pixel_data[pixel_idx + 2])
        
        # Try modulo 128
        red_mod = [v % 128 for v in red_values]
        red_string = ''.join(chr(v) for v in red_mod if 32 <= v <= 126)
        match = re.search(r'ABC\{(\d+)\}', red_string)
        if match:
            return int(match.group(1))
        
        # Try XOR 255
        red_xor = [v ^ 255 for v in red_values]
        xor_string = ''.join(chr(v) for v in red_xor if 32 <= v <= 126)
        match = re.search(r'ABC\{(\d+)\}', xor_string)
        if match:
            return int(match.group(1))
        
        # Try subtract 128
        red_sub = [v - 128 for v in red_values if v >= 128]
        sub_string = ''.join(chr(v) for v in red_sub if 32 <= v <= 126)
        match = re.search(r'ABC\{(\d+)\}', sub_string)
        if match:
            return int(match.group(1))
        
        # Method 3: First 7 pixels (red channel)
        red_subset = red_values[:7]
        subset_string = ''.join(chr(v % 128) for v in red_subset if 32 <= v % 128 <= 126)
        match = re.search(r'ABC\{(\d+)\}', subset_string)
        if match:
            return int(match.group(1))
        
        # Method 4: Diagonal pixels
        diagonal_values = [red_values[y * width + y] for y in range(min(width, height))]
        diag_string = ''.join(chr(v % 128) for v in diagonal_values if 32 <= v % 128 <= 126)
        match = re.search(r'ABC\{(\d+)\}', diag_string)
        if match:
            return int(match.group(1))
        
        # Method 5: Bit plane (bit 2)
        bit2_values = [(v >> 2) & 1 for v in red_values]
        lsb_bytes = []
        for i in range(0, len(bit2_values), 8):
            byte = sum((bit2_values[i + j] << (7 - j)) for j in range(min(8, len(bit2_values) - i)))
            lsb_bytes.append(byte)
        lsb_string = ''.join(chr(v) for v in lsb_bytes if 32 <= v <= 126)
        match = re.search(r'ABC\{(\d+)\}', lsb_string)
        if match:
            return int(match.group(1))
        
        return 0
    
    except Exception:
        return 0
    

red_values = [239, 253, 244, 218, 217, 252, 245, 240, 209, 210, 218, 225, 221, 214, 211, 226]
red_sub100 = [v - 100 for v in red_values if v >= 100]
print("Sub 100:", [chr(v) for v in red_sub100 if 32 <= v <= 126])