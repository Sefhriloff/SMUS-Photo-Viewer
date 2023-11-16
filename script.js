backColor = '#FFCC66';
foreColor = '#681F10';
filter = false;

arrayBuffer = [];

cnv = document.getElementById("stage");
ctx = cnv.getContext("2d", { alpha: true });

function handleFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            arrayBuffer = e.target.result;
            renderPhoto();
        };

        reader.readAsArrayBuffer(file);
    } else {
        console.log("No file provided.");
    }
}

function renderPhoto() {
    if (arrayBuffer.length < 1) return;
    var byteReader = new ByteReader(arrayBuffer)

    byteReader.skip(34);

    var height = byteReader.getShort();
    var width = byteReader.getShort() + 1;

    cnv.width = width - 1;
    cnv.height = height;

    byteReader.setLittleEndian(true);

    byteReader.skip(22);

    if (byteReader.getInt() != 1112101956) {
        alert('The file is not a valid photo.');
        return;
    }

    byteReader.getInt();

    var colors = [];
    while (byteReader.remainingBytes() > 0) {
        var amount = byteReader.getSignedByte();

        if (amount < 0) { // Repeat Sequence
            amount = -amount + 1;
            let color = byteReader.getByte();
            for (let p = 0; p < amount; p++) {
                colors.push(color);
            }
        } else { // Actual sequence
            for (let p = 0; p < amount + 1; p++) {
                colors.push(byteReader.getByte());
            }
        }

    }

    if (filter) {
        ctx.fillStyle = backColor;
        ctx.fillRect(0, 0, cnv.width, cnv.height);
        ctx.globalCompositeOperation = 'multiply';
    }

    for (let i = 0; i < colors.length; i++) {
        let h = i % width;
        let v = Math.trunc(i / width);
        let color = 255 - colors[i];
        ctx.fillStyle = `rgb(${color}, ${color}, ${color})`;
        ctx.fillRect(h, v, 1, 1);
    }

    if (filter) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = foreColor;
        ctx.fillRect(0, 0, cnv.width, cnv.height);
    }

    // Reset
    ctx.globalCompositeOperation = 'source-over';

    document.getElementById('checksum').innerText = `Checksum: ${checksum(colors)}`;
}

class ByteReader {
    constructor(byteArray, endian = false) {
        this.byteArray = new Uint8Array(byteArray);
        this.position = 0;
        this.littleEndian = endian;
    }

    setLittleEndian(endian) {
        this.littleEndian = endian;
    }

    getShort() {
        return this.readInteger(2);
    }

    getInt() {
        return this.readInteger(4);
    }

    getByte() {
        return this.byteArray[this.position++];
    }

    getSignedByte() {
        return (this.byteArray[this.position++] << 24) >> 24;
    }

    readInteger(byteCount) {
        let value = 0;
        for (let i = 0; i < byteCount; i++) {
            value += this.byteArray[this.position + i] << (this.littleEndian ? i * 8 : (byteCount - 1 - i) * 8);
        }
        this.position += byteCount;
        return value;
    }

    skip(bytes) {
        this.position += bytes;
    }

    remainingBytes() {
        return this.byteArray.length - this.position;
    }
}

function updatePageColors() {
    document.body.style.backgroundImage = `linear-gradient(to bottom right, ${backColor}, ${foreColor})`;
}

function showColorPicker(isVisible) {
    document.getElementById("pickcolor").style.display = (isVisible) ? "block" : "none";

    if (isVisible) {
        backColor = document.getElementById("backColor").value;
        foreColor = document.getElementById("foreColor").value;
        filter = true;
        updatePageColors();
        renderPhoto();
    }
}

function setColor(isBackColor, color) {
    if (isBackColor) {
        backColor = color;
    } else {
        foreColor = color;
    }
    updatePageColors();
    renderPhoto();
}

function setTonePreset(id) {
    let presets = [['#444', '#222'], ['#FFCC66', '#681F10'], ['#66FF66', '#153C06']];

    filter = true;

    if (id == 0) filter = false;

    backColor = presets[id][0];
    foreColor = presets[id][1];
    updatePageColors();
    showColorPicker(false);
    renderPhoto();
}

function checksum(colors) {
    var tL = [3, 2, 73, 28, 83, 21, 43, 90, 92, 91, 37, 4, 3, 84, 12, 102, 103, 108, 97, 43, 44, 89, 109, 65, 61, -4, 76];
    var tA = 0;
    var tW = 161;
    var tH = 117;
    for (let i = 1; i <= 100; i++) {
        const index = ((i * i % tH) * 162 + (i % tW));
        let paletteIndex = colors[index];
        tA = (tA + paletteIndex * tL[i % tL.length]) % 85000;
    }
    return tA;
}
