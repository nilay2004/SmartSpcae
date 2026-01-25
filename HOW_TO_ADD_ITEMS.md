# How to Add New Items

To add new items (furniture, doors, windows, etc.) to the Blueprint3D project, follow these steps:

## 1. Prepare Your 3D Model
The project uses Three.js JSON format for 3D models.
- Ensure your model is exported in a compatible JSON format (Three.js JSON Loader format).
- Place your `.js` (or `.json`) model file in the `example/models/js/` directory.

## 2. Prepare a Thumbnail Image
- Create a thumbnail image for your item (e.g., PNG or JPG).
- Place the image file in the `example/models/thumbnails/` directory.

## 3. Register the Item in `items.js`
- Open the file `example/js/items.js`.
- Add a new entry to the `items` array. The structure should look like this:

```javascript
    {
      "name" : "Your Item Name",
      "image" : "models/thumbnails/your_thumbnail.png",
      "model" : "models/js/your_model.js",
      "type" : "1" 
    },
```

### Item Types:
- `1`: Floor Item (e.g., Chair, Table, Sofa)
- `2`: Wall Item (e.g., Poster, Painting)
- `3`: In-Wall Item (e.g., Window)
- `7`: In-Wall Floor Item (e.g., Door)
- `8`: On-Floor Item (e.g., Rug) - *Check `src/items/factory.ts` or `src/items/item.ts` for more details if needed.*

## 4. Refresh the Application
- Reload `example/index.html` in your browser to see the new item in the "Add Items" list.
