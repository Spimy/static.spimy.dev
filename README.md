# cdn.spimy.dev

An express server is used to handle file uploading and serving all the files uploaded. Accepts only images.


## Routes

### GET

**Route:** `/`
GET requests is for fetching files from the server so there is no fixed route.

### Responses

**Status:** `404`
```json
{ "message": "You have stumbled across an inexistent path." }
```

**Status:** `200`
It is the link to the file which can be used as the source in the `<img>` tag.

### POST

**Route:** `/upload`
Post requests should contain a file upload with the field named `file`.

### Reponses

**Status:** `422`
This means either a file was not provided or the file provided was not an image. The following responses are returned:

**_No file provided_**
```json
{ "message": "A file was not provided in the request." }
```

**_Non-image file provided_**
```json
{ "message": "Only images are allowed." }
```

**Status:** `200`
File was successfully uploaded to the server and stored. The follow response is returned:

```json
{ 
  "message": "Successfully uploaded <filename>.<ext>.",
  "url": "http://cdn.spimy.dev/<filename>.<ext>"
}
```

The CDN should automatically redirect the user to HTTPS.