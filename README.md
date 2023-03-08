# static.spimy.dev

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

An optional body can be sent along the request:

```json
{ "folder": "screenshots" }
```

I am personally using the screenshots folder for my [ShareX](https://getsharex.com/) uploads.

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

**Status:** `413`
This means that the file uploaded was larger than the max file size limit allowed. The following response is returned:

```json
{
  "message": "The file uploaded was larger than the max size limit of <max_upload_size>MiB."
}
```

**Status:** `200`
File was successfully uploaded to the server and stored. The following response is returned:

```json
{
  "message": "Successfully uploaded <filename>.<ext>.",
  "url": "http://static.spimy.dev/<filename>.<ext>"
}
```

### DELETE

**Route:** `/delete`
Delete a file from the server. The request should contain the following body:

```json
{
  "url": "http://static.spimy.dev/<filename>.<ext>"
}
```

## Authorization

For `POST` and `DELETE` requests, the request must contain an `Authorization` header with the value being the same as what's been set in value for `UPLOAD_TOKEN` in the environment variable or `.env` file.

## Environment Variables (.env)

```
PORT=
UPLOAD_TOKEN=
```

The server should automatically redirect the user to HTTPS.
