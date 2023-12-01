<?php

/*
 * Copyright 2023 Sefhriloff
 * 
 * Special thanks to ASCII.
 * 
 * This file is part of https://github.com/Sefhriloff/SMUS-Photo-Viewer/.
 * 
 * You may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * 
 * Unless required by applicable law or agreed to in writing, software distributed
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

// Database Configuration
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "blunk";
$query = "SELECT image FROM items_photos WHERE id = ?";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Connection failed.");
}

$id = isset($_GET['id']) ? filter_var($_GET['id'], FILTER_VALIDATE_INT) : false;

if ($id == false) {
    die("Invalid id.");
}

$stmt = $conn->prepare($query);
$stmt->bind_param("i", $id);
$stmt->execute();
$stmt->bind_result($bytes);

if ($stmt->fetch()) {
    $byteReader = new ByteReader($bytes);
    $byteReader->skip(35);

    $height = $byteReader->getShort();
    $width = $byteReader->getShort() + 1;

    $byteReader->setLittleEndian(true);

    $byteReader->skip(22);

    if ($byteReader->getInt() != 1112101956) {
        die("It's not a valid photo.");
    }

    $byteReader->getInt();

    $colors = [];
    while ($byteReader->remainingBytes() > 0) {
        $amount = $byteReader->getSignedByte();
        if ($amount < 0) { // Repeat Sequence
            $amount = -$amount + 1;
            $color = $byteReader->getByte();
            for ($p = 0; $p < $amount; $p++) {
                $colors[] = $color;
            }
        } else { // Actual sequence
            for ($p = 0; $p < $amount + 1; $p++) {
                $colors[] = $byteReader->getByte();
            }
        }
    }

    $image = imagecreatetruecolor($width - 1, $height);

    for ($i = 0; $i < count($colors); $i++) {
        $h = $i % $width;
        $v = floor($i / $width);
        $color = 255 - $colors[$i];
        $colorPixel = imagecolorallocate($image, $color, $color, $color);
        imagesetpixel($image, $h, $v, $colorPixel);
    }

    header('Content-Type: image/png');
    imagepng($image);

    imagedestroy($image);
} else {
    echo "No photo found for ID: $id";
}

$stmt->close();
$conn->close();

class ByteReader
{
    private $byteArray;
    private $position = 0;
    private $littleEndian = false;

    public function __construct($byteArray, $endian = false)
    {
        $this->byteArray = unpack("C*", $byteArray);
        $this->position = 0;
        $this->littleEndian = $endian;
    }

    public function setLittleEndian($endian)
    {
        $this->littleEndian = $endian;
    }

    public function getShort()
    {
        return $this->readInteger(2);
    }

    public function getInt()
    {
        return $this->readInteger(4);
    }

    public function getByte()
    {
        return $this->byteArray[$this->position++];
    }

    public function getSignedByte()
    {
        $byte = $this->byteArray[$this->position++];
        return ($byte > 127) ? $byte - 256 : $byte;
    }

    private function readInteger($byteCount)
    {
        $value = 0;
        for ($i = 0; $i < $byteCount; $i++) {
            $value += $this->byteArray[$this->position + $i] << ($this->littleEndian ? $i * 8 : ($byteCount - 1 - $i) * 8);
        }
        $this->position += $byteCount;
        return $value;
    }

    public function skip($bytes)
    {
        $this->position += $bytes;
    }

    public function remainingBytes()
    {
        return count($this->byteArray) - $this->position;
    }
}
?>
