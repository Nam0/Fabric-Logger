# Fabric Logger

Simple web app to log and mange fabric inventory, got upload, search and edit

---

## Features

- Add fabric w meta data
- Auto handles duplicates
- Search by name type color tags or dimensions
- View fabric details in modal with img
- Edditing and deleting stuff
- Upload resizing

---

## Installation

1. Clone the repo:

2. Install dependencies:  
   npm install

3. Run the server:  
   node server.js

4. Open your browser and go to:  
   http://localhost:3000

---

## Project Structure

/data/fabrics.json      - JSON for storing fabric data  
/public                 - Frontend files  
/uploads                - uploads folder  
server.js               - Backend 

---

## API Endpoints

- **GET /fabrics?search=term**  

- **POST /fabrics**  

- **PUT /fabrics/:id**  

- **DELETE /fabrics/:id**  

---

## Notes

- Uploaded images are resized to 512x512
- Data is stored locally

---

## License
idk steal it bro
