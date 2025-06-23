const firebaseConfig = {
  apiKey: "AIzaSyBw9R8udu9eKary7uXCbEaM1Y4KgqQmJLI",
  authDomain: "stock-medias.firebaseapp.com",
  projectId: "stock-medias",
  storageBucket: "stock-medias.firebasestorage.app",
  messagingSenderId: "147450676635",
  appId: "1:147450676635:web:ea031f4da2acfd7ede4d3e",
  measurementId: "G-9TQHH4HN00"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();