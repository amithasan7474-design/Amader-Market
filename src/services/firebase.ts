import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
  update,
  set,
  get,
  onDisconnect,
} from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyD9wpxaomRzYn6tNeKbNNT4whD_jX5FsrU',
  authDomain: 'e-commerce-20ff9.firebaseapp.com',
  projectId: 'e-commerce-20ff9',
  databaseURL: 'https://e-commerce-20ff9-default-rtdb.firebaseio.com/',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Ignore if browser storage is restricted
});
export const db = getDatabase(app);

export {
  ref,
  push,
  onValue,
  remove,
  update,
  set,
  get,
  onDisconnect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  sendPasswordResetEmail,
  type User,
};
