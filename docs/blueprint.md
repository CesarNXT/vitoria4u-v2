# **App Name**: FireBoard

## Core Features:

- Server-Side Authentication: Authenticate users on the server using Firebase Admin SDK to ensure secure session validation.
- Role-Based Data Fetching: Fetch initial data from Firestore on the server based on the user's role (business or admin) to optimize data loading.
- Real-Time Data Updates: Utilize useEffect and onSnapshot from the client-side Firebase SDK to listen for real-time updates on collections and maintain a dynamic UI.
- Business Dashboard Metrics: Display key metrics for business users, including total clients, monthly appointments, and recurring clients.
- Appointment Chart: Visualize appointment data using recharts, displaying completed appointments per day for a selected month and year.
- Admin Dashboard Metrics: Display global metrics for admin users, including total businesses, total appointments, and total clients.
- Motivational Phrase: A tool will be called which leverages a server action to generate a motivational phrase from the 'generateDailyPhraseFlow' in 'src/ai/flows/ai-daily-phrase.ts'.

## Style Guidelines:

- Primary color: Soft blue (#A0BFE0) for a calm and professional feel.
- Background color: Light gray (#F0F2F5) for a clean and modern look.
- Accent color: Teal (#469990) to highlight key elements and actions.
- Body and headline font: 'Inter' sans-serif for a modern and neutral look. 
- Use consistent and clear icons from lucide-react to represent actions and data.
- Employ a responsive layout with ShadCN UI components for seamless viewing on various devices.
- Implement subtle animations for loading states and UI transitions to enhance user experience.