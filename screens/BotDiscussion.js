import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TextInput, TouchableOpacity, Animated, PanResponder, Dimensions, Keyboard, KeyboardAvoidingView, Platform, BackHandler, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import Message from '../components/Message';
import { useAuth } from '../context/AuthContext';
import MyInfiniteScrollList from '../components/StickersList';
import * as Progress from 'react-native-progress';
import { LazyLoadedImage } from '../components/LazyLoadImage';

export default function PrivateDiscussion({ height, onclose, editable }) {

    const screenWidth = Dimensions.get("window").width;
    const [isFocused, setIsFocused] = useState(false);
    const [showGameMenu, setShowGameMenu] = useState(false);
    const [value, setValue] = useState('');
    const [stream, setStream] = useState(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const [audioTimer, setAudioTimer] = useState(0);
    const audioTimerTimer = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const cancelRecordingRef = useRef(false);
    const [cancelRecording, setCancelRecording] = useState(false);

    const [canRecord, setCanRecord] = useState(false);
    const [highlightedQuote, setHighlightedQuote] = useState(null);
    const [quotingMessage, setQuotingMessage] = useState(null);
    const [inputHeight, setInputHeight] = useState(40); // Initial height
    const MenuAnim = useRef(new Animated.Value(0)).current; // Initial scale is 0
    const messageScrollList = useRef(null); // Initial scale is 0
    const textInputRef = useRef(null); // Initial scale is 0

    const { sendMessage, user, privateMessages, onlineUsers, sendAudio, baseUrl, games, stickers } = useAuth();

    const animatedValue = useRef(new Animated.Value(1)).current;

    const animateColor = () => {
        Animated.timing(animatedValue, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false, // backgroundColor animation requires useNativeDriver: false
        }).start(() => {
            // You can reset the value or chain another animation here
            setHighlightedQuote(null)
            animatedValue.setValue(1);
        });
    };

    const backgroundColor = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.6)'], // Red to Blue
    });

    useEffect(() => {
        if (highlightedQuote) {
            const i = privateMessages.findIndex(_m => _m.key.id == highlightedQuote)
            setTimeout(() => messageScrollList.current.scrollToIndex({ animated: true, index: i }), 100)
            animateColor()
        }
    }, [highlightedQuote])


    // Change input field size with inputted lines
    const handleContentSizeChange = (event) => {
        console.log(event.nativeEvent.contentSize)
        if (inputHeight >= event.nativeEvent.contentSize.height && event.nativeEvent.contentSize.height > 40)
            setInputHeight(event.nativeEvent.contentSize.height - 1);
        else
            setInputHeight(Math.min(100, event.nativeEvent.contentSize.height));
    };

    // Open a menu
    const OpenAmenu = (menu) => {
        if (isFocused) textInputRef.current.focus()
        if (MenuAnim !== 0) {
            if (showGameMenu === menu) {
                popOut()
            } else {
                if (showGameMenu == 'rec') {
                    cancelRecordingRef.current = true;  // immediate flag
                    audioChunks.current = [];           // clear chunks immediately
                    if (mediaRecorder.current?.state === "recording") {
                        mediaRecorder.current.stop();   // triggers onstop
                    }
                }
                MenuAnim.setValue(0)
                MenuAnim.setOffset(0)
                popIn()
                setShowGameMenu(menu)
            }
        } else {
            popIn()
            setShowGameMenu(menu)
        }
    }


    // send message
    const HandleSendMessage = (message, blob = null, type = 'text') => {
        let msg = {
            key: {
                id: user.jid + '-' + Date.now(),
                senderNumber: user.number,
                remoteJid: user.number,
                name: user.username,
                color: user.color
            },
            type,
            message,
            status: 'sending',
            time: Date.now()
        }
        if (type == 'text')
            sendMessage(msg)
        else if (type == 'audio')
            sendAudio(msg, blob)
        else if (type == 'sticker') {
            sendMessage(msg)
            OpenAmenu('sticker')
        }
    }

    //record voice
    const setUpAudio = async () => {
        try {

            let m = await navigator.mediaDevices.getUserMedia({ audio: true })
            let mrecorder = new MediaRecorder(m)
            console.log(m.getAudioTracks())

            mrecorder.onstart = (event) => {
                console.log('rec ...')
                setIsRecording(true)
                setShowGameMenu('rec')
                popIn()
                audioTimerTimer.current = setInterval(() => setAudioTimer(prev => prev + 1), 1000)
            };
            mrecorder.ondataavailable = (event) => {
                audioChunks.current.push(event.data)
            };
            mrecorder.onstop = () => {

                console.log("Recording stopped");

                // Reset UI / timers
                setShowGameMenu(false);
                popOut();
                setAudioTimer(0);
                clearInterval(audioTimerTimer.current);
                setIsRecording(false);
                m.getTracks().forEach(track => track.stop());

                // 👉 CANCEL CHECK (sync, 100% reliable)
                if (cancelRecordingRef.current) {
                    console.log("Recording cancelled → NOT sending.");
                    cancelRecordingRef.current = false;   // reset
                    audioChunks.current = [];             // extra safety
                    return;
                }

                // 👉 NORMAL SEND
                if (audioChunks.current.length !== 0) {
                    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                    console.log("Sending audio:", audioBlob);
                    HandleSendMessage({}, audioBlob, 'audio');
                    audioChunks.current = [];             // extra safety
                } else {
                    console.log("No audio to send");
                }
            };

            mrecorder.onerror = (ev) => {
                console.log('ERROR :', ev.error)
            }
            // Use the stream to record audio
            setStream(m);
            mediaRecorder.current = mrecorder
            setCanRecord(true)
        } catch (err) {
            console.error('Error accessing microphone:', err);
        }
    }


    useEffect(() => {

        //setUpAudio()

    }, [])

    const HandleVoiceRecordings = (action = 'start') => {
        if (action === 'start') {
            if (mediaRecorder.current?.state == "recording") {
                cancelRecordingRef.current = true;  // immediate flag
                audioChunks.current = [];           // clear chunks immediately
                mediaRecorder.current.stop();   // triggers onstop
            }

            setTimeout(() =>
                setUpAudio().then(() => mediaRecorder.current.start()), 10
            )
        } else {
            mediaRecorder.current.stop()
        }
    }

    useEffect(() => {
        setTimeout(() => messageScrollList.current.scrollToEnd({ animated: true }), 500)
    }, [privateMessages])

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
            setShowGameMenu(false)
        });
    };

    return (
        <View style={{ maxHeight: height, flex: 1, backgroundColor : '#2229'  }}>
            <View style={[styles.container]}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerInfo}>
                        <View style={styles.avatar} />
                        <View>
                            <Text style={styles.headerName}>Bot 🐺</Text>
                            <Text style={styles.headerStatus}>online</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => onclose()} style={styles.headerIcons}>
                        <Ionicons name="close" size={26} color="white" style={{ marginHorizontal: 10 }}>
                        </Ionicons>
                    </TouchableOpacity>
                </View>

                {/* Chat privateMessages */}
                <FlatList
                    ref={messageScrollList}
                    onTouchStart={() => OpenAmenu(false)}
                    data={privateMessages}
                    renderItem={({ item }) => (
                        <Message
                            onQuoteClicked={(quote) => {
                                setHighlightedQuote(quote)
                            }}
                            highlightedQuote={highlightedQuote}
                            backgroundColor={backgroundColor}
                            item={item}
                            onDrag={(item) => { setQuotingMessage({ ...item, quotedMessage: null }) }}
                            messages={privateMessages}
                            draggable={false}
                        />
                    )}
                    keyExtractor={(item) => item.key.id}
                    contentContainerStyle={styles.chatContainer}
                    ListEmptyComponent={() => {
                        if (!privateMessages) {
                            return (<ActivityIndicator size={'large'} style={{ alignSelf: "center" }} />)
                        } else {
                            return (<Text style={{ textAlign: "center", color: '#555', textShadowOffset: 2 }} > ---  Aucun Message  --- </Text>)
                        }
                    }}
                />

                {/* Input */}
                <View >

                    <View style={styles.inputContainer}>
                        {quotingMessage && <View style={[styles.quotedMessageContainer]}>
                            {!quotingMessage.key.fromMe && <Text style={[styles.messageName, { color: quotingMessage.key.color }]}>{quotingMessage.key.name || quotingMessage.key.senderNumber}</Text>}
                            {quotingMessage.type === "audio" ?
                                <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap" }}>
                                    <Ionicons style={{ margin: 5 }} name='play-circle' size={25} color={'#0266bb'} />
                                    <Progress.Bar width={100} height={2} borderColor={'#0266bb88'} />
                                </View>
                                :
                                quotingMessage.type == 'sticker' ?
                                    <LazyLoadedImage
                                        source={{ uri: `${baseUrl}/sticker?id=${quotingMessage.message.id}.webp` }}
                                        style={{ aspectRatio: 1, width: screenWidth / 12, borderRadius: 10, margin: 5 }}
                                    />
                                    :
                                    <Text style={styles.messageText}>{quotingMessage.message.caption}</Text>

                            }
                        </View>}

                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}>
                            <TextInput
                                ref={textInputRef}
                                style={[
                                    styles.input,
                                    isFocused ? styles.focusedInput : styles.unfocusedInput, { height: inputHeight }
                                ]}
                                onFocus={() => { setIsFocused(true); popOut(); }}
                                onBlur={() => { setIsFocused(false); }}
                                multiline
                                autoFocus={false}
                                onContentSizeChange={handleContentSizeChange}
                                onChangeText={setValue}
                                value={value}
                                placeholder="Enter text here"
                            />

                            <TouchableOpacity style={[styles.sendButton, { opacity: value.trim().length === 0 ? 0.5 : 1 }]} onPress={() => {
                                if (value.trim().length === 0) return
                                textInputRef.current.focus()
                                HandleSendMessage({
                                    caption: value,
                                    mention: [],
                                    quotedMessage: quotingMessage
                                })
                                setInputHeight(39);
                                setQuotingMessage(null)
                                setValue('')
                            }}>
                                <Ionicons name="send" size={20} color="white" />
                            </TouchableOpacity>

                        </View>
                    </View>

                </View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ece5dd', marginTop : 70,  borderTopLeftRadius : 15, borderTopRightRadius : 15 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#075E54',
        paddingHorizontal: 10,
        paddingVertical: 12,
        borderTopLeftRadius : 15, 
        borderTopRightRadius : 15
    },
    headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#bbb', marginRight: 8 },
    headerName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    headerStatus: { color: '#cfd', fontSize: 12 },
    headerIcons: { flexDirection: 'row', marginRight: 10 },

    chatContainer: { flex: 1 },

    quotedMessageContainer: {
        borderRadius: 10,
        marginVertical: 5,
        paddingVertical: 8,
        paddingHorizontal: 10,
        backgroundColor: "#eee",
        maxHeight: 100,
        overflow: 'hidden'
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
        backgroundColor: 'white',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 25,
        margin: 5,
        marginHorizontal: 15
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
    iconButton: { paddingLeft: 8 },
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
