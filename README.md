# MeetClone - Video Meeting Platform

A modern, secure video meeting platform built with React, Node.js, Express, and WebRTC. This application provides a complete video conferencing solution with host controls, participant management, and real-time communication.

## 🌟 Features

### Core Features

- **HD Video & Audio**: Crystal clear video and audio quality with WebRTC
- **Screen Sharing**: Share your screen with meeting participants
- **Real-time Chat**: Built-in chat functionality during meetings
- **Host Controls**: Comprehensive participant management for meeting hosts
- **Password Protection**: Secure meetings with optional password protection
- **Participant Limits**: Support for up to 10 participants per meeting
- **Auto-timeout**: 30-minute session limit for efficient resource management

### Host Management Features

- **Mute/Unmute Participants**: Control participant audio
- **Enable/Disable Video**: Control participant video feeds
- **Screen Share Control**: Allow or prevent screen sharing
- **Kick Participants**: Remove disruptive participants
- **End Meeting**: Host can end the meeting for all participants

### Security Features

- **Rate Limiting**: Protection against API abuse
- **Input Validation**: Comprehensive data validation and sanitization
- **XSS Protection**: Built-in cross-site scripting protection
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Error Handling**: Secure error responses that don't leak sensitive information

## 🏗️ Architecture

### Backend (Node.js + Express)

- **Database**: SQLite for development, easily configurable for PostgreSQL in production
- **WebSocket**: Real-time communication for chat and signaling
- **REST API**: Comprehensive API for room and participant management
- **Middleware**: Rate limiting, validation, error handling, and security

### Frontend (React + TypeScript)

- **Modern UI**: Built with Tailwind CSS and Radix UI components
- **Type Safety**: Full TypeScript implementation
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: WebSocket integration for live updates

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or bun package manager

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd replit
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   # Backend environment
   cd backend-new
   cp env.sample .env
   ```

   Configure your `.env` file:

   ```env
   NODE_ENV=development
   PORT=8001
   CORS_ORIGIN=http://localhost:5173
   DATABASE_URL=./database.sqlite
   ```

4. **Initialize the database**

   ```bash
   cd backend-new
   npm run db:migrate
   ```

5. **Start the development servers**

   ```bash
   # From the root directory
   npm run dev
   ```

   This will start both the backend (port 8001) and frontend (port 5173) servers.

### Production Deployment

1. **Build the applications**

   ```bash
   npm run build
   ```

2. **Start the production server**

   ```bash
   npm start
   ```

3. **Environment Configuration**
   - Set `NODE_ENV=production`
   - Configure proper `CORS_ORIGIN` for your domain
   - Use PostgreSQL for production database
   - Set up proper SSL certificates
   - Configure reverse proxy (nginx recommended)

## 📖 API Documentation

### Room Management

#### Create Room

```http
POST /api/rooms
Content-Type: application/json

{
  "title": "Team Meeting",
  "description": "Weekly team standup",
  "password": "optional-password",
  "isRecordingEnabled": false,
  "maxParticipants": 10
}
```

#### Join Room

```http
POST /api/rooms/join
Content-Type: application/json

{
  "roomId": "room-id-here",
  "participantName": "John Doe",
  "password": "optional-password"
}
```

#### Get Room Details

```http
GET /api/rooms/{roomId}
```

#### End Meeting (Host Only)

```http
POST /api/rooms/{roomId}/end
Content-Type: application/json

{
  "participantId": "host-participant-id"
}
```

### Participant Management

#### Get Participants

```http
GET /api/participants/room/{roomId}
```

#### Update Participant Settings

```http
PUT /api/participants/{participantId}
Content-Type: application/json

{
  "isAudioEnabled": true,
  "isVideoEnabled": false,
  "isScreenSharing": false
}
```

#### Host Controls

```http
POST /api/participants/{participantId}/kick
POST /api/participants/{participantId}/mute
POST /api/participants/{participantId}/video
POST /api/participants/{participantId}/screenshare
```

## 🎮 Usage Guide

### Creating a Meeting

1. **Navigate to the home page**
2. **Fill in meeting details**:
   - Meeting title (required)
   - Description (optional)
   - Password (optional)
   - Max participants (2-10)
   - Recording preference
3. **Click "Create Meeting"**
4. **Share the meeting ID with participants**

### Joining a Meeting

1. **Navigate to "Join Meeting"**
2. **Enter the meeting ID**
3. **Enter your display name**
4. **Enter password if required**
5. **Click "Join Meeting"**

### Host Controls

As a meeting host, you can:

- **View Host Controls Panel**: Click the "Host Controls" button
- **Manage Participants**:
  - Mute/unmute participant microphones
  - Enable/disable participant video
  - Control screen sharing permissions
  - Remove participants from the meeting
- **End Meeting**: Use the red "X" button to end the meeting for everyone

### Participant Features

All participants can:

- Toggle their own microphone and camera
- Share their screen
- Use the chat feature
- Leave the meeting

## 🔧 Configuration

### Environment Variables

#### Backend (`backend-new/.env`)

```env
NODE_ENV=development|production
PORT=8001
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=./database.sqlite
LOG_LEVEL=info
MAX_PARTICIPANTS_PER_ROOM=10
SESSION_TIMEOUT_MINUTES=30
```

#### Frontend

The frontend automatically connects to the backend API. For production, update the base URL in `client-new.ts`:

```typescript
const baseURL =
  process.env.NODE_ENV === "production"
    ? "https://your-api-domain.com"
    : "http://localhost:8001";
```

### Database Configuration

#### SQLite (Development)

The application uses SQLite by default for development. The database file is created automatically.

#### PostgreSQL (Production)

For production, configure PostgreSQL:

1. **Install PostgreSQL dependencies**:

   ```bash
   npm install pg @types/pg
   ```

2. **Update environment**:

   ```env
   DATABASE_URL=postgresql://username:password@host:port/database
   ```

3. **Update database connection** in `src/database/connection.ts`

## 🧪 Testing

### Running Tests

Run the comprehensive test suite:

```bash
# Start the development server first
npm run dev

# In a new terminal, run tests
cd backend-new
node test.js
```

### Test Coverage

The test suite includes:

- **API Endpoint Tests**: All REST endpoints
- **Error Handling Tests**: Validation and error responses
- **Performance Tests**: Concurrent request handling
- **Security Tests**: Rate limiting and input validation

### Manual Testing Checklist

- [ ] Create a room with various configurations
- [ ] Join a room with correct and incorrect credentials
- [ ] Test host controls (mute, video, kick)
- [ ] Test participant self-controls
- [ ] Test screen sharing
- [ ] Test chat functionality
- [ ] Test meeting timeout
- [ ] Test concurrent meetings
- [ ] Test error scenarios

## 🛠️ Development

### Project Structure

```
replit/
├── backend-new/               # Backend API server
│   ├── src/
│   │   ├── routes/           # API route handlers
│   │   ├── services/         # Business logic and WebSocket
│   │   ├── middleware/       # Request processing middleware
│   │   ├── database/         # Database connection and queries
│   │   └── types/           # TypeScript type definitions
│   ├── test.js              # Test suite
│   └── package.json
├── frontend/                 # React frontend application
│   ├── components/          # Reusable UI components
│   ├── pages/              # Page components
│   ├── lib/                # Utility functions
│   └── package.json
└── package.json             # Root workspace configuration
```

### Adding New Features

1. **Backend Changes**:
   - Add new routes in `src/routes/`
   - Update types in `src/types/index.ts`
   - Add middleware if needed
   - Update database schema if required

2. **Frontend Changes**:
   - Add new components in `components/`
   - Update API client in `client-new.ts`
   - Add new pages in `pages/`
   - Update routing in `App.tsx`

3. **Testing**:
   - Add API tests to `test.js`
   - Test UI changes manually
   - Verify WebSocket functionality

## 🚨 Troubleshooting

### Common Issues

#### Server Won't Start

- Check if ports 8001 and 5173 are available
- Verify Node.js version (18+ required)
- Check environment variables are set correctly

#### Database Errors

- Ensure SQLite database file has write permissions
- For PostgreSQL, verify connection string and database exists
- Run database migrations if needed

#### WebSocket Connection Issues

- Check firewall settings
- Verify CORS configuration
- Ensure WebSocket upgrades are allowed by proxy (if using one)

#### Video/Audio Not Working

- Check browser permissions for camera/microphone
- Ensure HTTPS in production (required for getUserMedia)
- Test with different browsers
- Check WebRTC connectivity

#### Performance Issues

- Monitor database query performance
- Check memory usage with multiple concurrent meetings
- Verify rate limiting isn't too restrictive
- Consider implementing connection pooling for production

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
LOG_LEVEL=debug
```

This provides detailed logs for troubleshooting.

## 📋 Production Checklist

### Security

- [ ] Enable HTTPS/SSL
- [ ] Configure proper CORS origins
- [ ] Set secure session timeouts
- [ ] Enable rate limiting
- [ ] Review and test input validation
- [ ] Implement proper authentication (if needed)
- [ ] Set up monitoring and alerting

### Performance

- [ ] Use PostgreSQL for production database
- [ ] Implement database connection pooling
- [ ] Set up Redis for session storage (if scaling)
- [ ] Configure proper caching headers
- [ ] Optimize bundle sizes
- [ ] Set up CDN for static assets

### Monitoring

- [ ] Set up application monitoring
- [ ] Configure error tracking
- [ ] Monitor WebSocket connections
- [ ] Set up database performance monitoring
- [ ] Create health check endpoints
- [ ] Set up automated backups

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests to ensure everything works
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests for new features
- Update documentation for API changes
- Ensure responsive design for UI changes
- Test on multiple browsers and devices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **WebRTC**: For peer-to-peer communication capabilities
- **React**: For the excellent frontend framework
- **Express**: For the robust backend framework
- **Tailwind CSS**: For the utility-first CSS framework
- **Radix UI**: For accessible UI components

---

## 📞 Support

For support and questions:

1. Check the troubleshooting section above
2. Review the API documentation
3. Run the test suite to identify issues
4. Open an issue on the repository

---

**Happy video conferencing! 🎥✨**
