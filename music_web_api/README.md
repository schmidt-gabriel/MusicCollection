# Music Collection API

## Description
The Music Collection Manager is a software application designed to help you organize and manage your music collection. It provides a user-friendly interface for adding, editing, and deleting music albums, as well as searching and sorting capabilities.

## Thrid Party Dependencies
- [Discogs](https://www.discogs.com/developers) Great music database
- [Google Auth](https://developers.google.com/identity/protocols/oauth2) Google OAuth2 for user authentication
- [Auth0](https://auth0.com/docs/quickstart/webapp/golang) Auth0 for api authentication
- [Spotify](https://developer.spotify.com/documentation/web-api/) Spotify API for album links for listening
- [MongoDB](https://docs.mongodb.com/manual/installation/) MongoDB for database
- [Docker](https://docs.docker.com/get-docker/) Docker for containerization
- [Docker Compose](https://docs.docker.com/compose/install/) Docker Compose for containerization
- [Golang](https://golang.org/doc/install) Golang for API


## Table of Contents
- [Description](#description)
- [Table of Contents](#table-of-contents)
- [Installation](#installation)
- [Features](#features)
- [Docker Compose Installation](#docker-compose-installation)
- [Dashboard Installation](#dashboard-installation)
- [API Installation](#api-installation)
- [MongoDB Installation](#mongodb-installation)
- [Usage](#usage)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)


## Features
- Add new music albums to your collection, including album title, artist, genre, release year, and cover image.
- Edit existing album information, such as updating the artist or genre.
- Delete albums from your collection.
- Search for albums by title, artist, or genre.
- Sort albums by title, artist, or release year.
- View album details, including cover image and tracklist.

## Docker Compose Installation
1. Clone the repository: `git clone https://github.com/gabrieloliveira95/music_web_api.git`
2. Navigate to the project directory: `cd music_web_api`
3. Create .env file
4. Start the application: `docker-compose up`
5. Open your web browser and navigate to `http://localhost:3000`
6. Use the provided interface to manage your music collection.

## API Installation
1. Navigate to the project directory: `cd music_web_api/src`
2. Start the application: `go run main.go`
3. Open your web browser and navigate to `http://localhost:3000`
4. Use the provided interface to manage your music collection.
5. Check docs for API endpoints: `http://localhost:3000/docs`

## MongoDB Installation
1. Install Docker: `https://docs.docker.com/get-docker/`
2. Pull MongoDB image: `docker pull mongo`

## Set .env file
1. Create .env file
2. Add following variables:
```
# Discogs
DISCOGS_TOKEN=

# Auth0
AUTH0_DOMAIN=
AUTH0_AUDIENCE=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# MongoDB
MONGODB_DATABASE=
MONGODB_URI=
```

## Usage
1. Open your web browser and navigate to `http://localhost:3000`
2. Use the provided interface to manage your music collection.

## Technologies Used
- GOLANG
- MongoDB
- Docker

## Contributing
Contributions are welcome! If you would like to contribute to this project, please follow these steps:
1. Fork the repository.
2. Create a new branch:
3. Make your changes and commit them:
4. Push to the branch:
5. Submit a pull request.

## License
This project is licensed under the [MIT License](LICENSE).

## Contact
For any questions or inquiries, please contact me at gabrieloliveira95@live.com.
