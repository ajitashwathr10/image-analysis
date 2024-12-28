const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage()});

const API_CONFIG = {
    apiKey: process.env.IMAGGA_API_KEY,
    apiSecret: process.env.IMAGGA_API_SECRET,
    baseUrl: 'https://api.imagga.com/v2'
};

app.use(express.static('public'));

app.post('/api/analyze', upload.single('image'), async (req, res) => {
    try {
        const authHeader = 'Basic ' + Buffer.from(`${API_CONFIG.apiKey}:${API_CONFIG.apiSecret}`).toString('base64');
        const formData = new FormData();
        formData.append('image', req.file.buffer, { filename: 'image.jpg' });
        const uploadResponse = await fetch(`${API_CONFIG.baseUrl}/uploads`, {
            method: 'POST',
            headers: { 'Authorization': authHeader },
            body: formData
        });

        const uploadData = await uploadResponse.json();
        const uploadId = uploadData.result.upload_id;

        const [colorResponse, tagsResponse] = await Promise.all([
            fetch(`${API_CONFIG.baseUrl}/colors?image_upload_id=${uploadId}`, {
                headers: { 'Authorization': authHeader }
            }),
            fetch(`${API_CONFIG.baseUrl}/tags?image_upload_id=${uploadId}`, {
                headers: { 'Authorization': authHeader }
            })
        ]);

        const [colorData, tagsData] = await Promise.all([
            colorResponse.json(),
            tagsResponse.json()
        ]);

        res.json({
            colors: colorData.result.colors,
            tags: tagsData.result.tags
        });

    } catch (error) {
        console.error('Error: ', error);
        res.status(500).json({ error: 'Failed to process image' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});