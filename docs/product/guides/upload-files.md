# Upload Files

Learn how to upload and share files in Synapse.

---

## What You'll Learn

- Upload images and documents
- Send files in messages
- Handle file validation
- Display file previews
- Track upload progress

**Time:** ~10 minutes

---

## Prerequisites

- Synapse running locally ([Quickstart](../getting-started/quickstart.md))
- Authenticated user with access token

---

## Supported File Types

Synapse supports common file types:

| Category | Types | Max Size |
|----------|-------|----------|
| **Images** | JPG, PNG, GIF, WEBP | 10 MB |
| **Documents** | PDF, DOC, DOCX, TXT | 10 MB |
| **Videos** | MP4, MOV, AVI | 50 MB |
| **Archives** | ZIP, RAR, TAR | 20 MB |

---

## Step 1: Upload a File

Upload a file to Synapse storage.

**Request:**

```bash
curl -X POST http://localhost:3000/api/upload \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

**Response:**

```json
{
  "url": "https://your-storage.com/uploads/abc123_image.jpg",
  "name": "image.jpg",
  "size": 245760,
  "type": "image/jpeg"
}
```

**Save the URL** - you'll use it to attach the file to a message.

---

## Step 2: Send File in Message

Attach the uploaded file to a message.

**Request:**

```bash
curl -X POST http://localhost:3000/api/rooms/room_abc123/messages \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Check out this screenshot",
    "attachments": [
      {
        "url": "https://your-storage.com/uploads/abc123_image.jpg",
        "name": "image.jpg",
        "size": 245760,
        "type": "image/jpeg"
      }
    ]
  }'
```

**Response:**

```json
{
  "id": "msg_xyz789",
  "content": "Check out this screenshot",
  "attachments": [
    {
      "url": "https://your-storage.com/uploads/abc123_image.jpg",
      "name": "image.jpg",
      "size": 245760,
      "type": "image/jpeg"
    }
  ],
  "userId": "user_123",
  "roomId": "room_abc123",
  "createdAt": "2025-12-12T19:00:00.000Z"
}
```

---

## JavaScript Implementation

**Complete file upload with progress:**

```javascript
async function uploadFile(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const xhr = new XMLHttpRequest();

  // Track upload progress
  xhr.upload.addEventListener('progress', (event) => {
    if (event.lengthComputable) {
      const percentComplete = (event.loaded / event.total) * 100;
      onProgress(percentComplete);
    }
  });

  // Upload file
  const response = await new Promise((resolve, reject) => {
    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${YOUR_ACCESS_TOKEN}`);
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };
    
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(formData);
  });

  return response;
}

// Usage
const file = document.getElementById('file-input').files[0];
const fileData = await uploadFile(file, (progress) => {
  console.log(`Upload progress: ${progress.toFixed(0)}%`);
});

console.log('File uploaded:', fileData.url);
```

---

## React Component Example

**File upload with preview:**

```typescript
import { useState } from 'react';

export function FileUpload({ roomId, onUploadComplete }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size (10 MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File too large (max 10 MB)');
      return;
    }

    setFile(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  // Upload file
  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);

    try {
      // 1. Upload file
      const fileData = await uploadFile(file, setProgress);

      // 2. Send message with attachment
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${YOUR_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: file.name,
          attachments: [fileData],
        }),
      });

      const message = await response.json();
      
      // Reset state
      setFile(null);
      setPreview(null);
      setProgress(0);
      
      onUploadComplete(message);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileSelect}
        accept="image/*,application/pdf,.doc,.docx"
      />

      {preview && (
        <img src={preview} alt="Preview" style={{ maxWidth: 200 }} />
      )}

      {file && (
        <div>
          <p>
            {file.name} - {(file.size / 1024).toFixed(0)} KB
          </p>
          
          {isUploading ? (
            <div>
              <progress value={progress} max="100" />
              <span>{progress.toFixed(0)}%</span>
            </div>
          ) : (
            <button onClick={handleUpload}>Upload</button>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Handle Different File Types

**Display files based on type:**

```javascript
function renderAttachment(attachment) {
  const { url, name, type } = attachment;

  // Images
  if (type.startsWith('image/')) {
    return (
      <img
        src={url}
        alt={name}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    );
  }

  // Videos
  if (type.startsWith('video/')) {
    return (
      <video controls style={{ maxWidth: '100%' }}>
        <source src={url} type={type} />
      </video>
    );
  }

  // Documents/Other
  return (
    <a href={url} download={name} target="_blank" rel="noopener noreferrer">
      📄 {name}
    </a>
  );
}
```

---

## Drag and Drop Upload

**Add drag-and-drop functionality:**

```javascript
function FileDropZone({ onFileDrop }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileDrop(files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: isDragging ? '2px dashed blue' : '2px dashed gray',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      {isDragging ? 'Drop file here' : 'Drag and drop file here'}
    </div>
  );
}
```

---

## Validate Files

**Client-side validation:**

```javascript
function validateFile(file) {
  const maxSize = 10 * 1024 * 1024; // 10 MB
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'video/mp4',
  ];

  // Check size
  if (file.size > maxSize) {
    throw new Error('File too large (max 10 MB)');
  }

  // Check type
  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not allowed');
  }

  return true;
}

// Usage
try {
  validateFile(selectedFile);
  // Proceed with upload
} catch (error) {
  alert(error.message);
}
```

---

## Compress Images

**Reduce file size before upload:**

```javascript
async function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = reject;
      img.src = e.target.result as string;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Usage
const originalFile = document.getElementById('file-input').files[0];
const compressedFile = await compressImage(originalFile);
console.log('Original:', originalFile.size, 'Compressed:', compressedFile.size);
```

---

## Python Example

**Upload file with Python:**

```python
import requests

def upload_file(file_path, token):
    url = 'http://localhost:3000/api/upload'
    headers = {'Authorization': f'Bearer {token}'}
    
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(url, headers=headers, files=files)
    
    if response.status_code != 200:
        raise Exception(f'Upload failed: {response.text}')
    
    return response.json()

def send_file_message(room_id, file_data, token):
    url = f'http://localhost:3000/api/rooms/{room_id}/messages'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    response = requests.post(url, headers=headers, json={
        'content': file_data['name'],
        'attachments': [file_data]
    })
    
    return response.json()

# Usage
token = 'YOUR_ACCESS_TOKEN'
file_data = upload_file('/path/to/image.jpg', token)
message = send_file_message('room_abc123', file_data, token)
print('File sent:', message)
```

---

## Next Steps

- **[Send Messages](./send-first-message.md)** - Complete messaging guide
- **[Messages Concept](../concepts/messages.md)** - How attachments work
- **[REST API Reference](../api-reference/rest/messages.md)** - API details

---

## Troubleshooting

### File Too Large

**Problem:** Upload fails with "File too large" error

**Solutions:**
1. Check file size limits (10 MB for images/docs)
2. Compress images before uploading
3. Split large files into chunks
4. Use external storage for very large files

### Upload Fails Silently

**Problem:** Upload doesn't complete

**Solutions:**
1. Check network connection
2. Verify access token is valid
3. Check server logs for errors
4. Ensure CORS is configured correctly

### Preview Not Showing

**Problem:** Image preview doesn't display

**Solutions:**
1. Verify file is an image type
2. Check FileReader browser support
3. Ensure file isn't corrupted
4. Check console for errors

---

## Related

- **[Messages API](../api-reference/rest/messages.md)**
- **[File Upload API](../api-reference/rest/files.md)**
- **[Messaging Guide](./send-first-message.md)**

