# Multiple File Upload with Multer & Cloudinary Guide

## 🚀 **Complete Setup for Multiple File Uploads**

Your system now supports both single and multiple file uploads with enhanced error handling and optimization.

---

## 📋 **What Was Updated**

### 1. **Enhanced Multer Middleware**

```javascript
// Multiple upload configurations available:
export const uploadSingle = multerUpload.single("image"); // Single file
export const uploadMultiple = multerUpload.array("images", 5); // Multiple files (max 5)
export const uploadFields = multerUpload.fields([
  // Mixed fields
  { name: "images", maxCount: 5 },
  { name: "thumbnail", maxCount: 1 },
]);
```

### 2. **Enhanced Cloudinary Utility**

```javascript
// New functions available:
uploadOnCloudinary(filePath); // Single file upload
uploadMultipleOnCloudinary(filePaths); // Multiple files upload
deleteFromCloudinary(publicId); // Delete from Cloudinary
```

### 3. **Updated Product Controller**

- Handles multiple product images
- Enhanced validation and error handling
- Support for variants data
- Better response structure

---

## 🖼️ **Frontend Usage Examples**

### **1. HTML Form for Multiple Images**

```html
<!-- For Product Creation -->
<form action="/api/product/create" method="POST" enctype="multipart/form-data">
  <input type="text" name="name" placeholder="Product Name" required />
  <input type="text" name="description" placeholder="Description" required />
  <input type="number" name="price" placeholder="Price" required />
  <input type="text" name="category" placeholder="Category" required />
  <input type="text" name="brand" placeholder="Brand" required />

  <!-- Multiple file input -->
  <input type="file" name="images" multiple accept="image/*" required />

  <!-- Variants as JSON string -->
  <textarea
    name="variants"
    placeholder='[{"size":"L","color":"Red","quantity":10}]'
  ></textarea>

  <button type="submit">Create Product</button>
</form>
```

### **2. JavaScript/React Frontend**

```javascript
// React component for product creation
const CreateProduct = () => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    brand: "",
    variants: [],
  });
  const [images, setImages] = useState([]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const productData = new FormData();

    // Add text fields
    Object.keys(formData).forEach((key) => {
      if (key === "variants") {
        productData.append(key, JSON.stringify(formData[key]));
      } else {
        productData.append(key, formData[key]);
      }
    });

    // Add multiple images
    images.forEach((image) => {
      productData.append("images", image);
    });

    try {
      const response = await fetch("/api/product/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: productData,
      });

      const result = await response.json();
      if (result.success) {
        console.log("Product created:", result.data);
      }
    } catch (error) {
      console.error("Error creating product:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Product Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />

      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleImageChange}
        required
      />

      <button type="submit">Create Product</button>
    </form>
  );
};
```

### **3. Postman/API Testing**

```
POST /api/product/create
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: multipart/form-data

Form Data:
- name: "Stylish T-Shirt"
- description: "Comfortable cotton t-shirt"
- price: 29.99
- category: "clothing"
- brand: "StallionWear"
- variants: [{"size":"M","color":"Blue","quantity":50}]
- images: [file1.jpg, file2.jpg, file3.jpg]
```

---

## 🔧 **API Endpoints Updated**

### **Create Product with Multiple Images**

```
POST /api/product/create
Content-Type: multipart/form-data
Authorization: Required
```

**Form Fields:**

- `name` (string, required)
- `description` (string, required)
- `price` (number, required)
- `category` (string, required)
- `brand` (string, required)
- `stock` (number, optional)
- `variants` (JSON string, optional)
- `images` (files, required - max 5 files)

**Response:**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Product created successfully",
  "data": {
    "_id": "...",
    "name": "Stylish T-Shirt",
    "description": "Comfortable cotton t-shirt",
    "price": 29.99,
    "category": "clothing",
    "brand": "StallionWear",
    "images": [
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/StallionWear/image1.jpg",
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/StallionWear/image2.jpg"
    ],
    "variants": [
      {
        "size": "M",
        "color": "Blue",
        "quantity": 50,
        "priceModifier": 0
      }
    ],
    "averageRating": 0,
    "totalStock": 50
  }
}
```

### **Update Product with New Images**

```
PUT /api/product/update/:id
Content-Type: multipart/form-data
Authorization: Required
```

**Behavior:**

- If new images are uploaded, they **replace** all existing images
- To append images instead, modify the controller logic
- All other fields are optional for updates

---

## 📊 **Enhanced Features**

### **1. Advanced Product Filtering**

```
GET /api/product?page=1&limit=10&category=clothing&brand=Nike&minPrice=20&maxPrice=100&search=shirt&sortBy=price&sortOrder=asc
```

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `category` - Filter by category
- `brand` - Filter by brand
- `minPrice` - Minimum price filter
- `maxPrice` - Maximum price filter
- `search` - Text search (uses MongoDB text index)
- `sortBy` - Sort field (price, name, createdAt, etc.)
- `sortOrder` - asc or desc

### **2. Error Handling for File Uploads**

```javascript
// Handles partial upload failures
{
  "successful": [
    { "url": "https://cloudinary.com/image1.jpg", "public_id": "img1" }
  ],
  "failed": [
    { "error": "File too large", "filePath": "/tmp/image2.jpg" }
  ],
  "totalUploaded": 1,
  "totalFailed": 1
}
```

### **3. File Validation**

- **File Types**: jpeg, jpg, png, gif, webp
- **File Size**: Max 10MB per file
- **File Count**: Max 5 files for products
- **Error Messages**: Descriptive validation errors

---

## 🛡️ **Security & Performance Features**

### **1. File Security**

- File type validation
- File size limits
- Automatic cleanup of temporary files
- Cloudinary optimization (auto quality, format)

### **2. Performance Optimizations**

- Parallel uploads to Cloudinary
- Automatic image optimization
- Database indexing for fast searches
- Pagination for large datasets

### **3. Error Recovery**

- Automatic cleanup on upload failures
- Graceful handling of partial failures
- Detailed error logging

---

## 🎯 **Key Benefits**

### **1. User Experience**

- Upload multiple product images at once
- Automatic image optimization
- Fast search and filtering
- Responsive error handling

### **2. Developer Experience**

- Simple API interface
- Comprehensive error messages
- Flexible upload configurations
- Clean separation of concerns

### **3. Business Benefits**

- Better product presentation with multiple images
- Efficient inventory management with variants
- Fast product discovery with search/filters
- Scalable file storage with Cloudinary

---

## 🚀 **Next Steps**

You can now:

1. **Create products** with multiple high-quality images
2. **Search and filter** products efficiently
3. **Manage variants** with different sizes, colors, and pricing
4. **Handle file uploads** with proper error handling
5. **Scale your application** with optimized queries and storage

Your e-commerce backend now has enterprise-level file handling capabilities! 🎉
