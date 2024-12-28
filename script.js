const tagsPerPage = 10;
let allTags = [];
let displayedTags = 0;

const elements = {
    imageInput: document.getElementById('imageInput'),
    imagePreview: document.getElementById('imagePreview'),
    uploadModal: document.getElementById('uploadModal'),
    uploadProgress: document.getElementById('uploadProgress'),
    uploadButton: document.getElementById('uploadButton'),
    seeMoreButton: document.getElementById('seeMoreButton'),
    exportTagsButton: document.getElementById('exportTagsButton')
};

elements.imageInput.addEventListener('change', handleImagePreview);
elements.uploadButton.addEventListener('click', handleImageUpload);
elements.seeMoreButton.addEventListener('click', showMoreTags);
elements.exportTagsButton.addEventListener('click', exportTagsToFile);

function handleImagePreview(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            elements.imagePreview.src = e.target.result;
            elements.imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

async function handleImageUpload() {
    const file = elements.imageInput.files[0];
    if(!file) {
        showToast('Please select an image to upload.');
        return;
    }
    const formData = new FormData();
    formData.append('image', file);

    try {
        showUploadModal();
        const response = await fetch('api/analyze', {
            method: 'POST',
            body: formData
        });

        if(!response.ok) {
            throw new Error('Failed to analyze image');
        }

        const data = await response.json();
        displayColors(data.colors);
        displayTags(data.tags);
    } catch(error) {
        console.error('Error: ', error);
        showToast('An error occurred while processing the image');
    } finally {
        hideUploadModal();
    }
}

async function uploadImage(formData, authHeader) {
    const response = await fetch(`${API_CONFIG.baseUrl}/uploads`, {
        method: 'POST',
        headers: { 'Authorization': authHeader },
        body: formData
    });

    if (!response.ok) throw new Error('Upload failed');

    const data = await response.json();
    return data.result.upload_id;
}

async function fetchColorAnalysis(uploadId, authHeader) {
    const response = await fetch(
        `${API_CONFIG.baseUrl}/colors?image_upload_id=${uploadId}`,
        { headers: { 'Authorization': authHeader } }
    );
    return response.json();
}

async function fetchTagAnalysis(uploadId, authHeader) {
    const response = await fetch(
        `${API_CONFIG.baseUrl}/tags?image_upload_id=${uploadId}`,
        { headers: { 'Authorization': authHeader } }
    );
    return response.json();
}

function displayColors(colors) {
    const colorsContainer = document.querySelector('.colors-container');
    colorsContainer.innerHTML = '<h2>Color Analysis</h2>';

    if (![colors.background_colors, colors.foreground_colors, colors.image_colors].some(arr => arr.length)) {
        colorsContainer.innerHTML += '<p class="error">No colors detected</p>';
        return;
    }

    const sections = [
        { title: 'Background Colors', data: colors.background_colors },
        { title: 'Foreground Colors', data: colors.foreground_colors },
        { title: 'Image Colors', data: colors.image_colors }
    ];
    sections.forEach(section => {
        if (section.data.length) {
            const sectionHtml = `
                <div class="color-section">
                    <h3>${section.title}</h3>
                    <div class="results">
                        ${section.data.map(color => generateColorItem(color)).join('')}
                    </div>
                </div>
            `;
            colorsContainer.innerHTML += sectionHtml;
        }
    });
    addColorCopyListeners();
}

function generateColorItem(color) {
    return `
        <div class="result-item" data-color="${color.html_code}">
            <div class="color-info">
                <div class="color-box" style="background-color: ${color.html_code}"></div>
                <p>${color.html_code}<br><span>${color.closest_palette_color}</span></p>
            </div>
            <div class="progress-bar">
                <div class="progress" style="width: ${color.percent}%"></div>
                <span>${color.percent.toFixed(1)}%</span>
            </div>
        </div>
    `;
}

function displayTags(tags) {
    allTags = tags;
    displayedTags = 0;
    const tagsContainer = document.querySelector('.tags-container');
    tagsContainer.querySelector('.error').style.display = 'none';
    tagsContainer.querySelector('.results').innerHTML = '';
    
    showMoreTags();
    
    elements.seeMoreButton.style.display = displayedTags < allTags.length ? 'block' : 'none';
    elements.exportTagsButton.style.display = allTags.length ? 'block' : 'none';
}

function showMoreTags() {
    const tagsContainer = document.querySelector('.tags-container .results');
    const tagsToShow = allTags.slice(displayedTags, displayedTags + tagsPerPage);
    
    tagsToShow.forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.className = 'result-item';
        tagElement.innerHTML = `
            <p>${tag.tag.en}</p>
            <div class="progress-bar">
                <div class="progress" style="width: ${tag.confidence}%"></div>
                <span>${tag.confidence.toFixed(1)}%</span>
            </div>
        `;
        tagsContainer.appendChild(tagElement);
    });
    
    displayedTags += tagsToShow.length;
    elements.seeMoreButton.style.display = displayedTags < allTags.length ? 'block' : 'none';
}

function exportTagsToFile() {
    const tagsText = allTags
        .map(tag => `${tag.tag.en}: ${tag.confidence.toFixed(1)}%`)
        .join('\n');
    
    const blob = new Blob([tagsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'image-tags.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
/*
function showUploadModal() {
    elements.uploadModal.style.display = 'flex';
    elements.uploadProgress.style.width = '0%';
}
*/

function showUploadModal() {
    elements.uploadModal.classList.add('show');
    elements.uploadProgress.style.width = '0%';
}

function hideUploadModal() {
    elements.uploadModal.classList.remove('show');
}

function updateProgressBar(percentage) {
    elements.uploadProgress.style.width = `${percentage}%`;
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }, 100);
}

function addColorCopyListeners() {
    document.querySelectorAll('.result-item[data-color]').forEach(item => {
        item.addEventListener('click', () => {
            const colorCode = item.dataset.color;
            navigator.clipboard.writeText(colorCode)
                .then(() => showToast(`Copied: ${colorCode}`))
                .catch(() => showToast('Failed to copy color code'));
        });
    });
}

function assembleChunks(chunks, totalLength) {
    const uint8Array = new Uint8Array(totalLength);
    let position = 0;    
    for (const chunk of chunks) {
        uint8Array.set(chunk, position);
        position += chunk.length;
    }
    return new TextDecoder().decode(uint8Array);
}

