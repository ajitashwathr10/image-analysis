const tagsPerPage = 10;

document.getElementById('uploadButton'.addEventListener('click', async () => {
    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];
    const imagePreview = document.getElementById('imagePreview');
    const uploadModal = document.getElementById('uploadModal');
    const uploadProgress = document.getElementById('uploadProgress');

    if(!file) return showToast('Please select an image to upload');
    const reader = new FileReader();
    reader.onload = e => imagePreview.src = e.target.result;
    reader.readAsDataURL(file);

    const apiKey = 'acc_40e5be0bc6727e4'
    const apiSecret = 'bf3ce7f65b9cc0d1636a5106c72aa96d'
    const authHeader = 'Basic ' + btoa(`${apiKey}:${apiSecret}`);

    const formData = new FormData();
    formData.append('image', file);

    try {
        uploadModal.style.display = 'block';
        uploadProgress.style.width = '0%';

        const uploadResponse = await fetch('https://api.imagga.com/v2/uploads', {
            method: 'POST',
            headers: { 'Authorization': authHeader},
            body: formData
        });

        if(!uploadResponse.ok) {
            throw new Error('Upload failed.');
        }

        const contentLength =+ uploadResponse.headers.get('Content-Length');
        const reader = uploadResponse.body.getReader();
        let receivedLength = 0;
        let chunks = [];

        while(true) {
            const { done, value } = await reader.read();
            if(done) break;
            chunks.push(value);
            receivedLength += value.length;
            uploadProgress.style.width = `${receivedLength / contentLength * 100}%`;
        }

        const responseArray = new Uint8Array(receivedLength);
        let position = 0;
        for(const chunk of chunks) {
            responseArray.set(chunk, position);
            position += chunk.length;
        }

        const text = new TextDecoder('utf-8').decode(responseArray);
        const { result: { upload_id } } = JSON.parse(text);

        const [colorResult, tagsResult ] = await Promise.all([
            fetch(`https://api.imagga.com/v2/colors?image_upload_id=${upload_id}`, {
                headers: { 'Authorization': authHeader }
            }).then(res => res.json()),
            fetch(`https://api.imagga.com/v2/tags?image_upload_id=${upload_id}`, {
                headers: { 'Authorization': authHeader }
            }).then(res => res.json())
        ])
    }
}))