import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Button, Text, StyleSheet, KeyboardAvoidingView, Image, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useAuth, TiktokUsernameSearch } from '../context/AuthContext';


const validateEmail = (email) => {
  return /[a-z]/i.test(email);
};

const colorPalette = ["#550000ff", "#004f00ff", "#00005dff", "#4f004fff", "#004f4fff", "#535300ff", "#1A1A1A", // Near-black grey
  "#303030", // Dark grey
  "#400000", // Dark red
  "#004000", // Dark green
  "#000040", // Dark blue
  "#400040", // Dark purple
  "#58321E", // Dark brown
  "#1C1C1C"  // Another very dark grey
];


const RoleGateway = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [number, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const emailRef = useRef(null);

  const { login, reloadUser, baseUrl } = useAuth();

  const handleSubmit = async () => {
    if (email.length == 0 || number.length == 0 || password.length == 0) {
      Alert.alert("Please, enter all necessary informations")
      return
    }
    if ((validateEmail(email) == null || email.split('.')[email.split('.').length - 1].length >= 4)) {
      Alert.alert("Adresse Mail Incorrect", "Entrez une adresse mail correcte")
      return
    }
    if (password.length < 8) {
      Alert.alert("mot de passe non sécurisé", "Entrez un mot de passe d'au moin 8 caractères")
      return
    }

    try {
      const credentials = {
        jid: number,
        email,
        admin: false,
        number,
        password,
        username,
        canReceiveAlerts: true,
        color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
        online: false,
        lid: number,
        groups: ["werewolve-111"],
        dateCreated: Date.now(),
        pushName: username,
        games: { WEREWOLF: 0 },
        points: 50,
        pointsTransactions: []
      };
      await login(credentials);
    } catch (error) {
      alert('Authentication failed: ' + error.message);
    }
  };


  const handleDeepLink = async (event) => {
    // Parse redirect URL
    // with the setInterval this is not needed
    const url = Linking.parse(event.url);
    if (url.path === 'TiktokLogin') {
      //await reloadUser()
    }
  };

  useEffect(() => {
    // Add deep link listener
    const sub = Linking?.addEventListener('url', handleDeepLink);
    // Clean up listener
    return () => sub.remove()
  }, []);


  return (
    <KeyboardAvoidingView
      behavior="height"
      style={[styles.container]}
    >
      <View>
        <Text style={styles.title}>WEREWOLVE 3.0 🐺</Text>

        <TextInput
          placeholder="Pseudo"
          value={username}
          onChangeText={setUsername}
          style={[styles.input]}
        />


        <TextInput
          ref={emailRef}
          placeholder="Email"
          value={email}
          onChangeText={(text) => setEmail(text.toLocaleLowerCase())}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          placeholder="Numéro whatsapp Ex: 650687834"
          value={number}
          onChangeText={setPhone}
          style={styles.input}
          keyboardType="number-pad"
        />

        <TextInput
          placeholder="mot de passe"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
        />

        <Button
          title={"Create Creator Account"}
          onPress={() => handleSubmit()}
          color="#FF0050"
        />

        <TouchableOpacity
          style={styles.switchAuth}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.switchText}>
            Tu as déjà un compte? connecte-toi
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>

  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#121212'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 30
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#222'
  },
  activeButton: {
    backgroundColor: '#FF0050'
  },
  toggleText: {
    color: '#aaa',
    fontWeight: '500'
  },
  activeText: {
    color: 'white'
  },
  input: {
    height: 50,
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#222',
    color: 'white'
  },
  switchAuth: {
    marginTop: 20,
    alignSelf: 'center'
  },
  switchText: {
    color: '#00F2EA'
  }
});

export default RoleGateway;