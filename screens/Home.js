import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';


const messages = [
  {
    key: {
      id: '1',
      fromMe: false,
      senderNumber: '665254',
      name: 'xxx',
      color: '#faf'
    },
    type: 'text',
    message: {
      caption: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi id orci eget nisl vehicula congue.',
      mention: []
    },
    time: '8:45'
  },
  {
    key: {
      id: '2',
      fromMe: true,
      senderNumber: '665254',
      name: 'moi',
      color: '#faf'
    },
    type: 'text',
    message: {
      caption: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi id orci eget nisl vehicula congue.',
      mention: []
    },
    time: '8:45',
  }
];

const games = [
  {
    id: '0',
    tag: '!werewolve',
    name: 'Loup Garou',
    icon: '🐺',
    color: '#eee'
  }, {
    id: '1',
    tag: '!pendu',
    name: 'Pendu',
    icon: '☠️',
    color: '#eee'

  }, {
    id: '2',
    tag: '!quizfr',
    name: 'Quiz FR',
    icon: '🇫🇷',
    color: '#eee'

  },
];


export default function App() {
  const [isFocused, setIsFocused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [value, setValue] = useState('');
  const [inputHeight, setInputHeight] = useState(40); // Initial height
  const MenuAnim = useRef(new Animated.Value(0)).current; // Initial scale is 0

  const handleContentSizeChange = (event) => {
    console.log(event.nativeEvent.contentSize)
    if (inputHeight >= event.nativeEvent.contentSize.height && event.nativeEvent.contentSize.height > 40)
      setInputHeight(event.nativeEvent.contentSize.height - 1);
    else
      setInputHeight(Math.min(100, event.nativeEvent.contentSize.height));
  };


  const popIn = () => {
    Animated.spring(MenuAnim, {
      toValue: 1, // Scale to 1 (full size)
      bounciness: 11,
      speed: 20,
      useNativeDriver: true, // Use native driver for performance
    }).start();
  };

  const popOut = () => {
    Animated.timing(MenuAnim, {
      toValue: 0, // Scale back to 0
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowMenu(false)
    });
  };


  const renderMessage = ({ item }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{item.message.date}</Text>
        </View>
      );
    }

    const isMe = item.key.fromMe;
    return (
      <View style={{ flexDirection: !isMe ? "row" : 'row-reverse', width: '100%', flexGrow: 1 }}>
        <View style={[styles.messageContainer, isMe ? styles.myMessage : styles.otherMessage]}>
          {!isMe && <Text style={[styles.messageName, { color: item.key.color }]}>{item.key.name || item.key.senderNumber}</Text>}
          <Text style={styles.messageText}>{item.message.caption}</Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        <View style={{ justifyContent: 'center', padding: 10 }}>
          <TouchableOpacity>
            <FontAwesome name='share'
              style={{
                color: "#fff",
                backgroundColor: "#bbb9",
                width: 30,
                aspectRatio: 1,
                borderRadius: 50,
                textAlign: 'center',
                alignContent: "center",
                paddingVertical: 10
              }} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="arrow-back" size={24} color="white" />
        <View style={styles.headerInfo}>
          <View style={styles.avatar} />
          <View>
            <Text style={styles.headerName}>Community</Text>
            <Text style={styles.headerStatus}>online</Text>
          </View>
        </View>
        <View style={styles.headerIcons}>
          <Ionicons name="videocam" size={22} color="white" style={{ marginHorizontal: 10 }} />
          <Ionicons name="call" size={22} color="white" />
        </View>
      </View>

      {/* Chat messages */}
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.key.id}
        contentContainerStyle={styles.chatContainer}
      />

      {/* Input */}

      <View>

        {showMenu && <Animated.View
          style={{
            transform: [{ scale: MenuAnim }], backgroundColor: "#fff", padding: 10, marginHorizontal: 10, borderRadius: 10
          }}
        >
          {/* Your pop-up content here */}
          <FlatList
            data={games}
            renderItem={({ item }) => (
              <View style={{ alignItems: 'center' }}>
                <View style={{ padding: 15, backgroundColor: item.color, margin: 10, borderRadius: 100 }}>
                  <Text style={{ fontSize: 30 }}>{item.icon}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: "black", textAlign: "center" }}>{item.name}</Text>
              </View>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.gameContainer}
          />

          <View style={{ borderWidth: 1, marginVertical: 10, marginHorizontal: 20, opacity: 0.15 }}></View>

        </Animated.View>}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.iconButton} onPress={() => {
            if (!showMenu) {
              setShowMenu(true)
              popIn()
            } else {
              popOut()
            }
          }}>
            <Ionicons name="options" size={24} color="#007bff" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.iconButton, { marginLeft: 10 }]} onPress={() => {
            if (!showMenu) {
              setShowMenu(true)
              popIn()
            } else {
              popOut()
            }
          }}>
            <Ionicons size={24} color={"#007bff"} name='document' />
          </TouchableOpacity>

          <TextInput
            style={[
              styles.input,
              isFocused ? styles.focusedInput : styles.unfocusedInput, { height: inputHeight }
            ]}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            multiline
            onContentSizeChange={handleContentSizeChange}
            onChangeText={setValue}
            value={value}
            placeholder="Enter text here"
          />
          <TouchableOpacity style={styles.sendButton}>
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ece5dd' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#075E54',
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#bbb', marginRight: 8 },
  headerName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  headerStatus: { color: '#cfd', fontSize: 12 },
  headerIcons: { flexDirection: 'row' },

  chatContainer: { padding: 10 },

  messageContainer: {
    maxWidth: '80%',
    borderRadius: 10,
    marginVertical: 5,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#dcf8c6',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
  },
  messageName: { fontSize: 15, fontWeight: 'bold', color: '#111' },
  messageText: { fontSize: 13, color: '#111' },
  timeText: {
    fontSize: 11,
    color: '#555',
    alignSelf: 'flex-end',
    marginTop: 4,
  },

  dateContainer: {
    alignSelf: 'center',
    backgroundColor: '#bfe3ff',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginVertical: 8,
  },
  dateText: { color: '#004d7a', fontWeight: 'bold', fontSize: 12 },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 6,
    margin: 5,
    borderRadius: 25
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 17,
    color: '#111',
    borderColor: "#fff0",
    borderWidth: 0,
    maxHeight: 300,
    outlineStyle: 'none'
  },
  iconButton: { marginLeft: 8 },
  sendButton: {
    backgroundColor: '#075E54',
    borderRadius: 25,
    padding: 10,
  },
  gameContainer: {
    flexDirection: 'row',
    justifyContent: "space-around"
  }
});
