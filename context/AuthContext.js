import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useState, useContext, useEffect, use } from 'react';
import Toast from '../components/Toast';
import CustomPrompt from '../components/CustomPrompt';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, setDoc, getDocs } from "firebase/firestore";
import { db } from '../firebase';

const AuthContext = createContext();

//const baseUrl = 'http://192.168.1.188' // URL du serveur local pour test
const baseUrl = 'https://camer-tok-server.vercel.app' // URL du serveur enligne pour test

const UserUrl = baseUrl + '/api/users';
const NotificationUrl = baseUrl + '/api/notification';
const ChannelUrl = baseUrl + '/api/notification/channel';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [canShowToast, setCanShowToast] = useState(true);

  const [showPrompt, setShowPrompt] = useState(false)
  const [showPromptInput, setShowPromptInput] = useState(true)
  const [promptTitle, setPromptTitle] = useState('')
  const [promptDescription, setPromptDescription] = useState('')
  const [promptButtons, setPromptButtons] = useState([])


  const ws = new WebSocket('ws://51.20.105.210:8088');

  ws.addEventListener('error', console.error);

  ws.addEventListener('open', function open() {
    ws.send(JSON.stringify({ type: 'init' }));
  });

  ws.addEventListener('message', function message(data) {
    console.log('received: %s', JSON.stringify(data, null, 2));
  });



  ///////  TOASTS
  const AddToasts = (title, body, onClose = null, buttons = [], image = null, duration = 3000) => {
    let f = (s = setShowToast, t = setToast, cst = setCanShowToast) => {
      s(false)
      t(null)
      cst(true)
      if (onClose)
        onClose()
    }
    setToasts(toasts.concat([{ title, body, image, duration, buttons, onClose: f }]))
  }

  // Check for existing session on app start
  useEffect(() => {
    const showToastsOrder = () => {
      if (toasts.length === 0 || !canShowToast) return
      setToast(toasts[0])
      setToasts(toasts.filter((_, i) => i !== 0))
      setShowToast(true)
      setCanShowToast(false)
    };

    showToastsOrder();
  }, [toasts, canShowToast]);


  ////////  PROMPT
  const TriggerPrompt = (title = 'Raison du rejet',
    message = 'Veillez donner la raison pour laquelle cette vidéo n\'est pas éligible',
    showInput = true,
    submitText = 'Ok',
    cancelText = 'Annuler',
    onSubmit = (text) => { },
    onCancel = (text) => { }) => {

    setShowPromptInput(showInput)
    setPromptTitle(title)
    setPromptDescription(message)
    setPromptButtons([
      { text: submitText, action: (text) => { onSubmit(text); setShowPrompt(false) } },
      { text: cancelText, action: (text) => { onCancel(text); setShowPrompt(false) } },
    ])
    setShowPrompt(true)

  }

  // Check for existing session on app start
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        const userLastLogin = await AsyncStorage.getItem('lastLogin');
        if (userData) {
          if (parseInt(userLastLogin) + (1000 * 60 * 60 * 24 * 7) < Date.now()) {
            alert('Connexion expiré', 'veillez vous reconnecter à votre compte')
            return
          }
          let userJSON = JSON.parse(userData);
          await AsyncStorage.setItem('lastLogin', Date.now().toString());
          setUser(userJSON);
        } else {
          console.log("no user -- need to login")
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setIsLoading(false);
      }

      try {
        const allUsersResponse = await GetAllusersAPI();
        setAllUsers(allUsersResponse)
      } catch (error) {
        alert("Une érreur est survenue lors de la connexion avec le serveur, veillez vérifier votre connexion internet")
      }
    };

    checkLoginStatus();
  }, []);


  const login = async (credentials, login = false) => {
    try {
      // Replace with your actual API call
      const response = await AuthAPI(credentials, login);
      if (response.error) {
        throw response;
      }
      setUser(response);
      await AsyncStorage.setItem('user', JSON.stringify(response));
      await AsyncStorage.setItem('lastLogin', Date.now().toString());
      return response;
    } catch (error) {
      throw error;
    }
  };


  const updateUserInfo = async (credentials) => {
    try {
      console.log("FCM  saving in server:");
      // Replace with your actual API call
      const response = await UserUpdateAPI({ email: user.email, updates: credentials })
      if (response.error) {
        throw response;
      }
      setUser(response);
      console.log("FCM  saved in server:");
      await AsyncStorage.setItem('user', JSON.stringify(response));
      await AsyncStorage.setItem('lastLogin', Date.now().toString());
      return response;
    } catch (error) {
      throw error;
    }
  };

  const sendNotification = async (receivers, topic, title = '', body = "", data = {}, sender = { email: 'Kolabo' }) => {
    if ((!receivers || receivers.length === 0) && !topic) return false

    const _data = {
      receivers,
      topic,
      title,
      body,
      data,
      sender
    }
    const resp = await NotificationApi(_data)

    if (!resp || resp.error) {
      return resp
    }
    return resp
  }

  const subscribeNotification = async (tokens, topic) => {
    if ((!tokens || tokens.length === 0) && !topic) return false

    const _data = {
      tokens,
      topic
    }
    const resp = await SubscribeTokenToChannelAPI(_data)

    if (!resp || resp.error) {
      return resp
    }
    return resp
  }

  const reloadUser = async () => {
    try {
      // Replace with your actual API call
      if (!user || Object.keys(user).length == 0) return null
      const response = await AuthAPI(user, true);
      if (response.error) {
        throw response;
      }
      setUser(response);
      await AsyncStorage.setItem('user', JSON.stringify(response));
      await AsyncStorage.setItem('lastLogin', Date.now().toString());
      return response;
    } catch (error) {
      console.log("error reloading user", error)
      return null;
    }
  };

  const logout = async () => {
    setIsLoading(true)
    await AsyncStorage.removeItem('user');
    setUser(null);
    setIsLoading(false)

  };


  return (
    <AuthContext.Provider value={{
      baseUrl,
      allUsers,
      user,
      login,
      logout,
      reloadUser,
      updateUserInfo,
      sendNotification,
      AddToasts,
      subscribeNotification,
      TriggerPrompt
    }}>
      {children}
      {showToast && (
        <Toast
          title={toast.title}
          body={toast.body}
          duration={toast.duration}
          buttons={toast.buttons}
          onClose={toast.onClose}
        />
      )}

      <CustomPrompt
        visible={showPrompt}
        title={promptTitle}
        showInput={promptTitle === 'Raison du rejet'}
        message={promptDescription}
        onSubmit={promptButtons[0]?.action}
        onCancel={promptButtons[1]?.action}
        submitText={promptButtons[0]?.text}
        cancelText={promptButtons[1]?.text}
      />
    </AuthContext.Provider>
  );
};

const GetAllusersAPI = async () => {
  const user_response = await getDocs(collection(db, 'players'))

  if (user_response.empty) {
    return { docs: [], size: 0 }
  } else {
    const newUser = user_response.toJSON();
    return newUser
  }
}

// Fake authentication for development
const AuthAPI = async (user, login = false) => {
  try {
    const email = user.email;

    // Vérifier si le joueur existe
    const user_response = await getDoc(doc(db, "players", email))

    if (!user_response.exists()) {

      if (!login) {
        // Créer un nouveau joueur
        await setDoc(doc(db, "players", email), user);

        return user
      } else {
        return { error: true, message: "l'adresse mail ne correspond pas, si vous n'avez pas de compte, créez en un" }
      }
    } else {
      if (login) {
        // Mettre à jour le joueur existant
        const newUser = user_response.data()
        if (newUser.password !== user.password) {
          return { error: true, message: "le mot de passe ne correspond pas" }
        }
        return newUser;
      } else {
        return { error: true, message: "Ce compte existe déjà, connectez vous plutôt" }
      }
    }
  } catch (error) {
    console.error('Error initializing player:', error);
  }
};



// Fake authentication for development
const NotificationApi = async (data) => {
  try {
    // Créer un nouveau joueur
    const createResponse = await fetch(NotificationUrl, {
      method: 'Post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...data
      })
    });

    return await createResponse.json();
  } catch (error) {
    console.error('Error initializing player:', error);
    return null
  }
};


// Fake authentication for development
const SubscribeTokenToChannelAPI = async (data) => {
  try {
    // Créer un nouveau joueur
    const createResponse = await fetch(ChannelUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...data
      })
    });

    return await createResponse.json();
  } catch (error) {
    console.error('Error initializing player:', error);
    return null
  }
};

// Fake authentication for development
const UserUpdateAPI = async (_user) => {
  try {
    // Créer un nouveau joueur
    const createResponse = await fetch(UserUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ..._user
      })
    });

    return await createResponse.json();
  } catch (error) {
    console.error('Error initializing player:', error);
    return null
  }
};

export const useAuth = () => useContext(AuthContext);