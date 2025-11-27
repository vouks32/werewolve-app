import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import Toast from '../components/Toast';
import CustomPrompt from '../components/CustomPrompt';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, setDoc, getDocs } from "firebase/firestore";
import { db } from '../firebase';

const AuthContext = createContext();

// Update base URL to point to your Express long polling server
const baseUrl = 'https://socket.share.zrok.io'; // Your Express server URL

// API URLs for other services (keep your existing ones)
const UserUrl = 'https://camer-tok-server.vercel.app/api/users';
const NotificationUrl = 'https://camer-tok-server.vercel.app/api/notification';
const ChannelUrl = 'https://camer-tok-server.vercel.app/api/notification/channel';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [games, setGames] = useState(null);
  const [stickers, setStickers] = useState(null);
  const [allUsers, setAllUsers] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [messages, setMessages] = useState(null);
  const [privateMessages, setPrivateMessages] = useState(null);
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

  // Long polling references
  const clientIdRef = useRef(null);
  const lastPollTimestampRef = useRef(0);
  const pollingActiveRef = useRef(false);
  const pollingTimeoutRef = useRef(null);

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

  useEffect(() => {
    console.log('messages', messages?.map(m => m.key.id))
  }, [messages])
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

  // Initialize long polling
  const initializePolling = async (_user) => {
    try {
      console.log('Initializing long polling...');
      const response = await fetchWithZrok(`${baseUrl}/init`);
      const data = await response.json();

      if (data.success) {
        console.log('Polling initialized with clientId:', data.clientId);
        clientIdRef.current = data.clientId;
        setGames(data.games || []);
        setStickers(data.stickers || []);
        setAllUsers(data.players || []);
        setOnlineUsers(data.onlineUsers)
        console.log('online users', data.players)
        setPrivateMessages(data.messages?.filter(m => m.key?.remoteJid && m.key.remoteJid == _user.number).map(m => m.key?.senderNumber === _user.number
          ? { ...m, key: { ...m.key, fromMe: true }, status: 'sent' }
          : { ...m, key: { ...m.key, fromMe: false }, status: 'sent' }) || []);
        setMessages(data.messages?.filter(m => !m.key?.remoteJid || m.key.remoteJid.startsWith('werewolve')).map(m => m.key?.senderNumber === _user.number
          ? { ...m, key: { ...m.key, fromMe: true }, status: 'sent' }
          : { ...m, key: { ...m.key, fromMe: false }, status: 'sent' }) || []);
        lastPollTimestampRef.current = Date.now();

        // Start polling
        startPolling();
      } else {
        console.error('Init failed:', data.error);
        setTimeout(initializePolling, 5000);
      }
    } catch (error) {
      console.error('Failed to initialize polling:', error);
      // Retry after 5 seconds
      setTimeout(initializePolling, 5000);
    }
  };

  // Start long polling
  const startPolling = () => {
    if (pollingActiveRef.current) return;

    pollingActiveRef.current = true;
    performPoll();
  };

  // Stop long polling
  const stopPolling = () => {
    pollingActiveRef.current = false;
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }
  };

  // Perform a single poll request
  const performPoll = async () => {
    if (!pollingActiveRef.current || !clientIdRef.current) return;
    const _user = JSON.parse(await AsyncStorage.getItem('user'))
    try {
      const pollUrl = `${baseUrl}/poll?clientId=${clientIdRef.current}&clientNumber=${_user?.number}&since=${lastPollTimestampRef.current}&timeout=25000`;

      const response = await fetchWithZrok(pollUrl);
      const data = await response.json();

      if (data.success && data.messages) {
        lastPollTimestampRef.current = data.timestamp;

        // Process received messages
        data.messages.forEach(notification => {
          handleNotification(notification);
        });
      }

      if (data.serverType == 'poll') {
        console.log("online users = ", data.onlineUsers)
        setOnlineUsers(data.onlineUsers?.filter(u => u !== _user.number))
      }

      // Continue polling regardless of result
      if (pollingActiveRef.current) {
        pollingTimeoutRef.current = setTimeout(performPoll, 100);
      }
    } catch (error) {
      console.error('Polling error:', error);
      // Retry after 1 second on error
      if (pollingActiveRef.current) {
        pollingTimeoutRef.current = setTimeout(performPoll, 1000);
      }
    }
  };

  // Handle notifications from server
  const handleNotification = async (notification) => {
    console.log('Received notification:', notification);
    const _user = JSON.parse(await AsyncStorage.getItem('user'))

    switch (notification.type) {
      case 'message':
        if (notification.to) {
          if (notification.to === _user?.number)
            setPrivateMessages(prev => {
              const newMessage = _user && notification.data.key?.senderNumber === _user?.number
                ? { ...notification.data, key: { ...notification.data.key, fromMe: true }, status: 'sent' }
                : { ...notification.data, key: { ...notification.data.key, fromMe: false }, status: 'sent' };

              // Avoid duplicates
              if (prev.some(msg => msg.key?.id === newMessage.key?.id)) {
                console.log('msg seen')
                return prev.map(msg =>
                  msg.key.id === newMessage.key.id ?
                    { ...msg, status: 'sent' }
                    : msg
                );
              }
              console.log('msg not seen')
              return [...prev, newMessage];
            });
        } else {
          setMessages(prev => {
            const newMessage = _user && notification.data.key?.senderNumber === _user?.number
              ? { ...notification.data, key: { ...notification.data.key, fromMe: true }, status: 'sent' }
              : { ...notification.data, key: { ...notification.data.key, fromMe: false }, status: 'sent' };

            // Avoid duplicates
            if (prev.some(msg => msg.key?.id === newMessage.key?.id)) {
              console.log('msg seen')
              return prev.map(msg =>
                msg.key.id === newMessage.key.id ?
                  { ...msg, status: 'sent' }
                  : msg
              );
            }
            console.log('msg not seen')
            return [...prev, newMessage];
          });
        }
        break;

      case 'users-update':
        setAllUsers(notification.data || {});
        break;

      case 'users-count':
        setOnlineUsers(notification.data.message)
        break;

      default:
        console.log('Unknown notification type:', notification.type);
    }
  };

  // Check for existing session on app start
  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');
        const userLastLogin = await AsyncStorage.getItem('lastLogin');
        if (userData) {
          if (parseInt(userLastLogin) + (1000 * 60 * 60 * 24 * 365) < Date.now()) {
            AddToasts('Connexion expiré', 'Veuillez vous reconnecter à votre compte');
            return;
          }
          let userJSON = JSON.parse(userData);
          await AsyncStorage.setItem('lastLogin', Date.now().toString());
          setUser(userJSON);

          initializePolling(userJSON);

        } else {
          console.log("no user -- need to login");
          const response = await fetchWithZrok(`${baseUrl}/users`);
          const data = await response.json();

          if (data.success) {
            setAllUsers(data.players || []);
          } else {
            console.log('Init failed:', data.error);
            alert("Erreur dans la connexion avec le serveur")
          }
        }
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkLoginStatus();

    // Cleanup on unmount
    return () => {
      stopPolling();
    };
  }, []);

  const login = async (credentials, isLogin = false) => {
    try {
      if (isLogin) {
        // Login logic
        if (allUsers && allUsers.find((_user) => _user.number === credentials.number)) {
          const response = allUsers.find((_user) => _user.number === credentials.number)
          if (response.password !== credentials.password) {
            throw { error: true, message: "Le mot de passe n'est pas correct" };
          }
          setUser(response);
          await AsyncStorage.setItem('user', JSON.stringify(response));
          await AsyncStorage.setItem('lastLogin', Date.now().toString());
          initializePolling(response);
          return response;
        } else {
          throw { error: true, message: "Le numéro n'existe pas" };
        }
      } else {
        // Registration logic - using long polling server
        console.log('Registering user via long polling server...');
        const response = await fetchWithZrok(`${baseUrl}/inscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: credentials
          })
        });

        const result = await response.json();

        if (result.success) {
          setUser(result.data);
          await AsyncStorage.setItem('user', JSON.stringify(result.data));
          await AsyncStorage.setItem('lastLogin', Date.now().toString());
          initializePolling(response);
          return result.data;
        } else {
          throw { error: true, message: result.error || "Inscription échouée" };
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const updateUserInfo = async (credentials) => {
    try {
      console.log("Updating user info in server:");
      const response = await UserUpdateAPI({ email: user.email, updates: credentials });
      if (response.error) {
        throw response;
      }
      setUser(response);
      console.log("User info updated in server:");
      await AsyncStorage.setItem('user', JSON.stringify(response));
      await AsyncStorage.setItem('lastLogin', Date.now().toString());
      return response;
    } catch (error) {
      throw error;
    }
  };

  const sendMessage = async (message) => {
    try {
      // Optimistically update UI
      const optimisticMessage = {
        ...message,
        key: { ...message.key, fromMe: true },
        status: 'sending'
      };

      if (!optimisticMessage.key.remoteJid.startsWith('werewolve'))
        setPrivateMessages(prev => [...prev, optimisticMessage]);
      else
        setMessages(prev => [...prev, optimisticMessage]);

      // Send to long polling server
      const response = await fetchWithZrok(`${baseUrl}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: message
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update message status
        setMessages(prev =>
          prev.map(msg =>
            msg.key.id === message.key.id
              ? { ...msg, status: 'sent' }
              : msg
          )
        );
      } else {
        throw new Error(result.error || "Échec de l'envoi du message");
      }
    } catch (error) {
      // Revert optimistic update on error
      setMessages(prev => prev.filter(msg => msg.key.id !== message.key.id));
      throw error;
    }
  };

  async function sendAudio(msg, blob) {
    const formData = new FormData();
    formData.append("audio", blob, msg.key.id + ".ogg");
    formData.append("data", JSON.stringify(msg));

    console.log("Blob size:", blob.size); // MUST be > 0

    const optimisticMessage = {
      ...msg,
      key: { ...msg.key, fromMe: true },
      status: 'sending'
    };
    setMessages(prev => [...prev, optimisticMessage]);

    const response = await fetchWithZrok(`${baseUrl}/audio`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success) {
      // Update message status
      /* setMessages(prev =>
         prev.map(_msg =>
           _msg.key.id === msg.key.id
             ? { ...msg, status: 'sent' }
             : msg
         )
       );*/
    } else {
      throw new Error(result.error || "Échec de l'envoi du message");
    }
  }


  const sendNotification = async (receivers, topic, title = '', body = "", data = {}, sender = { email: 'werewolve' }) => {
    if ((!receivers || receivers.length === 0) && !topic) return false;

    const _data = {
      receivers,
      topic,
      title,
      body,
      data,
      sender
    };
    const resp = await NotificationApi(_data);

    if (!resp || resp.error) {
      return resp;
    }
    return resp;
  };

  const subscribeNotification = async (tokens, topic) => {
    if ((!tokens || tokens.length === 0) && !topic) return false;

    const _data = {
      tokens,
      topic
    };
    const resp = await SubscribeTokenToChannelAPI(_data);

    if (!resp || resp.error) {
      return resp;
    }
    return resp;
  };

  const reloadUser = async () => {
    try {
      if (!user || Object.keys(user).length == 0) return null;

      // Refresh users list from long polling server
      const response = await fetchWithZrok(`${baseUrl}/users`);
      const data = await response.json();

      if (data.success && data.players) {
        setAllUsers(data.players);
        const updatedUser = data.players[user.number];
        if (updatedUser) {
          setUser(updatedUser);
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          await AsyncStorage.setItem('lastLogin', Date.now().toString());
          return updatedUser;
        }
      }
      return null;
    } catch (error) {
      console.log("Error reloading user", error);
      return null;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    stopPolling();
    await AsyncStorage.removeItem('user');
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{
      baseUrl,
      games,
      messages,
      privateMessages,
      allUsers,
      onlineUsers,
      stickers,
      user,
      login,
      logout,
      reloadUser,
      updateUserInfo,
      sendMessage,
      sendAudio,
      sendNotification,
      AddToasts,
      subscribeNotification,
      TriggerPrompt,
      fetchWithZrok
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
        showInput={showPromptInput}
        message={promptDescription}
        onSubmit={promptButtons[0]?.action}
        onCancel={promptButtons[1]?.action}
        submitText={promptButtons[0]?.text}
        cancelText={promptButtons[1]?.text}
      />
    </AuthContext.Provider>
  );
};

// Keep your existing API functions (they remain unchanged)
const GetAllusersAPI = async () => {
  const user_response = await getDocs(collection(db, 'players'));

  if (user_response.empty) {
    return { docs: [], size: 0 };
  } else {
    const newUser = user_response.toJSON();
    return newUser;
  }
};

const AuthAPI = async (user, login = false) => {
  try {
    const email = user.email;

    // Vérifier si le joueur existe
    const user_response = await getDoc(doc(db, "players", email));

    if (!user_response.exists()) {
      if (!login) {
        // Créer un nouveau joueur
        await setDoc(doc(db, "players", email), user);
        return user;
      } else {
        return { error: true, message: "l'adresse mail ne correspond pas, si vous n'avez pas de compte, créez en un" };
      }
    } else {
      if (login) {
        // Mettre à jour le joueur existant
        const newUser = user_response.data();
        if (newUser.password !== user.password) {
          return { error: true, message: "le mot de passe ne correspond pas" };
        }
        return newUser;
      } else {
        return { error: true, message: "Ce compte existe déjà, connectez vous plutôt" };
      }
    }
  } catch (error) {
    console.error('Error initializing player:', error);
  }
};

const NotificationApi = async (data) => {
  try {
    const createResponse = await fetchWithZrok(NotificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...data
      })
    });

    return await createResponse.json();
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
};

const SubscribeTokenToChannelAPI = async (data) => {
  try {
    const createResponse = await fetchWithZrok(ChannelUrl, {
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
    console.error('Error subscribing to channel:', error);
    return null;
  }
};

const UserUpdateAPI = async (_user) => {
  try {
    const createResponse = await fetchWithZrok(UserUrl, {
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
    console.error('Error updating user:', error);
    return null;
  }
};

// Helper function for fetchWithZrok with zrok header
const fetchWithZrok = (url, options = {}) => {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'skip_zrok_interstitial': 'true'
    }
  });
};

export const useAuth = () => useContext(AuthContext);