import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, PanResponder, Animated, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import * as Progress from 'react-native-progress';
import { useAuth } from '../context/AuthContext';
import { LazyLoadedImage } from './LazyLoadImage';
import MessageFormatter from './formatWhatsapp';

const Message = ({ item, onDrag, messages, onQuoteClicked, backgroundColor, highlightedQuote, draggable = true }) => {

    const { baseUrl, fetchWithZrok } = useAuth();


    const prevMessage = messages[messages.findIndex((msg) => msg.key.id === item.key.id) - 1]

    const screenWidth = Dimensions.get("window").width;
    const audioRef = useRef(null);

    const [loadingAudio, setLoadingAudio] = useState(false);
    const [audioisPlaying, setAudioIsPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const triggered = useState(false);

    const translateX = useRef(new Animated.Value(0)).current;
    const handleTrigger = () => {
        onDrag(item)
        // Put your custom logic here
        triggered.current = false;
    };
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,

            onPanResponderMove: (_, gestureState) => {
                // Limit dragging between 0 and +150 px only (no negative movement)
                if (gestureState.dx >= 0 && gestureState.dx <= 100) {
                    translateX.setValue(gestureState.dx);

                    // Trigger function once when fully dragged
                    if (gestureState.dx >= 50) {
                        if (!triggered.current) {
                            triggered.current = true;
                            handleTrigger();
                            Animated.spring(translateX, {
                                toValue: 0,
                                useNativeDriver: true,
                            }).start();
                        }
                    }
                }
            },

            onPanResponderRelease: () => {
                triggered.current = false;
                // Animate box back to starting position
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                }).start();
            },
            onPanResponderEnd: () => {
                triggered.current = false;
                // Animate box back to starting position
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                }).start();
            },
        })
    ).current;

    async function playFromServer() {
        if (!audioRef.current && !audioisPlaying) {


            async function fetchAndPlayAudio(audioUrl) {
                setLoadingAudio(true);
                const audioCtx = new AudioContext();

                try {
                    const _response = await fetchWithZrok(audioUrl);
                    if (_response.ok) {
                        const source = audioCtx.createBufferSource();
                        const arrBuffer = await _response.arrayBuffer();
                        const audioBuffer = await audioCtx.decodeAudioData(arrBuffer);

                        source.buffer = audioBuffer;
                        source.connect(audioCtx.destination);

                        setLoadingAudio(false);
                        setAudioIsPlaying(true);
                        return { source, audioBuffer, audioCtx };
                    }
                } catch (error) {
                    console.error("Error during audio fetch and playback:", error);
                }
            }

            const { source, audioBuffer, audioCtx } = await fetchAndPlayAudio(
                `${baseUrl}/audio?id=${item.key.id}.ogg`
            );

            if (!source) {
                setAudioIsPlaying(false);
                return;
            }

            // ---- PROGRESSION TRACKING ----
            const duration = audioBuffer.duration;
            const startTime = audioCtx.currentTime;

            function updateProgress() {
                const elapsed = audioCtx.currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1); // Clamp 0..1

                setAudioProgress(progress); // <--- update React state

                if (progress < 1) {
                    requestAnimationFrame(updateProgress);
                } else {
                    setAudioProgress(0); // <--- update React state
                }
            }

            requestAnimationFrame(updateProgress);

            // ---- END HANDLER ----
            source.onended = () => {
                setAudioIsPlaying(false);
                setAudioProgress(0);
            };

            source.start();
        }
    }


    if (item.type === 'date') {
        return (
            <View style={styles.dateContainer}>
                <Text style={styles.dateText}>{item.message.date}</Text>
            </View>
        );
    }

    const isMe = item.key.fromMe;


    const MessageContainer = () => (
        <>

        </>
    )

    if (draggable)
        return (
            <Animated.View
                {...panResponder.panHandlers}
                style={{ transform: [{ translateX }], paddingHorizontal: 10, flexDirection: !isMe ? "row" : 'row-reverse', width: '100%', flexGrow: 1, backgroundColor: highlightedQuote == item.key.id ? backgroundColor : '#fff0' }}>
                {!isMe && (prevMessage?.key.senderNumber !== item.key.senderNumber || !prevMessage) &&

                    <View style={{ paddingRight: 5 }}>
                        <Text style={{ backgroundColor: item.key.color, padding: 15, borderRadius: 50 }}></Text>
                    </View>
                }
                {!isMe && (prevMessage?.key.senderNumber === item.key.senderNumber && prevMessage) &&

                    <View style={{ paddingRight: 35 }}>
                    </View>
                }

                <View style={[styles.messageContainer, isMe ? styles.myMessage : item.key?.isBot ? styles.botMessage : styles.otherMessage]}>

                    {/**   NAME  */}
                    {!isMe && (prevMessage?.key.senderNumber !== item.key.senderNumber || !prevMessage) && <Text style={[styles.messageName, { color: item.key.color }]}>{item.key.name}</Text>}

                    {/**   QUOTED MESSAGE  */}
                    {item.message.quotedMessage &&
                        <TouchableOpacity onPress={() => { onQuoteClicked(item.message.quotedMessage.key.id) }} style={[styles.messagequoteContainer(item.message.quotedMessage?.key.color)]}>
                            <Text style={[styles.messageName, { color: item.message.quotedMessage?.key.color }]}>{item.message.quotedMessage?.key.name}</Text>
                            {item.message.quotedMessage?.type === "audio" ?
                                <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap" }}>
                                    <Ionicons style={{ margin: 5 }} name='play-circle' size={25} color={'#0266bb'} />
                                    <Progress.Bar width={100} height={2} borderColor={'#0266bb88'} />
                                </View>
                                :
                                item.message.quotedMessage?.type == 'sticker' ?
                                    <LazyLoadedImage
                                        source={{ uri: `${baseUrl}/sticker?id=${item.message.quotedMessage?.message.id}.webp` }}
                                        style={{ aspectRatio: 1, width: screenWidth / 12, borderRadius: 10, margin: 5 }}
                                    />
                                    :
                                    <Text style={styles.messageText}>{item.message.quotedMessage?.message.caption}</Text>
                            }
                        </TouchableOpacity>}

                    {/**  MESSAGE  */}
                    {item.type == 'audio' ?
                        <TouchableOpacity onPress={() => playFromServer()} style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap" }}>
                            {loadingAudio ? <ActivityIndicator size={25} style={{ margin: 5 }} /> : <Ionicons style={{ margin: 5 }} name='play-circle' size={25} color={'#0266bb'} />}
                            <Progress.Bar progress={audioProgress} width={100} height={2} borderColor={'#0266bb88'} />
                        </TouchableOpacity>
                        :
                        item.type == 'sticker' ?
                            <LazyLoadedImage
                                source={{ uri: `${baseUrl}/sticker?id=${item.message.id}.webp` }}
                                style={{ aspectRatio: 1, width: screenWidth / 4, borderRadius: 10, margin: 5 }}
                            />
                            :
                            <MessageFormatter message={item.message.caption} />
                    }

                    {/**   TIME  */}
                    <Text style={styles.timeText}>
                        {isMe && <Text style={{ color: item.status === "sending" ? '#555' : "#03b3ff" }}> {item.status === "sending" ? '⨀' : '✓'} </Text>}
                        {(new Date(item.time)).toLocaleTimeString('En-GB', { hour: '2-digit', minute: "2-digit" })}
                    </Text>
                </View>
            </Animated.View>
        );
    else
        return (
            <Animated.View
                style={{ paddingHorizontal: 10, flexDirection: !isMe ? "row" : 'row-reverse', width: '100%', flexGrow: 1, backgroundColor: highlightedQuote == item.key.id ? backgroundColor : '#fff0' }}>
                {!isMe && (prevMessage?.key.senderNumber !== item.key.senderNumber || !prevMessage) &&

                    <View style={{ paddingRight: 5 }}>
                        <Text style={{ backgroundColor: item.key.color, padding: 15, borderRadius: 50 }}></Text>
                    </View>
                }
                {!isMe && (prevMessage?.key.senderNumber === item.key.senderNumber && prevMessage) &&

                    <View style={{ paddingRight: 35 }}>
                    </View>
                }

                <View style={[styles.messageContainer, isMe ? styles.myMessage : item.key?.isBot ? styles.botMessage : styles.otherMessage]}>

                    {/**   NAME  */}
                    {!isMe && (prevMessage?.key.senderNumber !== item.key.senderNumber || !prevMessage) && <Text style={[styles.messageName, { color: item.key.color }]}>{item.key.name}</Text>}

                    {/**   QUOTED MESSAGE  */}
                    {item.message.quotedMessage &&
                        <TouchableOpacity onPress={() => { onQuoteClicked(item.message.quotedMessage.key.id) }} style={[styles.messagequoteContainer(item.message.quotedMessage?.key.color)]}>
                            <Text style={[styles.messageName, { color: item.message.quotedMessage?.key.color }]}>{item.message.quotedMessage?.key.name}</Text>
                            {item.message.quotedMessage?.type === "audio" ?
                                <View style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap" }}>
                                    <Ionicons style={{ margin: 5 }} name='play-circle' size={25} color={'#0266bb'} />
                                    <Progress.Bar width={100} height={2} borderColor={'#0266bb88'} />
                                </View>
                                :
                                item.message.quotedMessage?.type == 'sticker' ?
                                    <LazyLoadedImage
                                        source={{ uri: `${baseUrl}/sticker?id=${item.message.quotedMessage?.message.id}.webp` }}
                                        style={{ aspectRatio: 1, width: screenWidth / 12, borderRadius: 10, margin: 5 }}
                                    />
                                    :
                                    <Text style={styles.messageText}>{item.message.quotedMessage?.message.caption}</Text>
                            }
                        </TouchableOpacity>}

                    {/**  MESSAGE  */}
                    {item.type == 'audio' ?
                        <TouchableOpacity onPress={() => playFromServer()} style={{ alignItems: "center", flexDirection: "row", flexWrap: "wrap" }}>
                            {loadingAudio ? <ActivityIndicator size={25} style={{ margin: 5 }} /> : <Ionicons style={{ margin: 5 }} name='play-circle' size={25} color={'#0266bb'} />}
                            <Progress.Bar progress={audioProgress} width={100} height={2} borderColor={'#0266bb88'} />
                        </TouchableOpacity>
                        :
                        item.type == 'sticker' ?
                            <LazyLoadedImage
                                source={{ uri: `${baseUrl}/sticker?id=${item.message.id}.webp` }}
                                style={{ aspectRatio: 1, width: screenWidth / 4, borderRadius: 10, margin: 5 }}
                            />
                            :
                            <MessageFormatter message={item.message.caption} />
                    }

                    {/**   TIME  */}
                    <Text style={styles.timeText}>
                        {isMe && <Text style={{ color: item.status === "sending" ? '#555' : "#03b3ff" }}> {item.status === "sending" ? '⨀' : '✓'} </Text>}
                        {(new Date(item.time)).toLocaleTimeString('En-GB', { hour: '2-digit', minute: "2-digit" })}
                    </Text>
                </View>
            </Animated.View>
        );
};

const styles = StyleSheet.create({

    messageContainer: {
        minWidth: 100,
        maxWidth: '80%',
        borderRadius: 10,
        marginVertical: 1,
        paddingVertical: 8,
        paddingHorizontal: 10,

    },
    messagequoteContainer: (color) => ({
        backgroundColor: color + '1',
        borderLeftColor: color,
        borderLeftWidth: 3,
        padding: 10,
        margin: 5,
        marginLeft: 0,
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
    }),
    myMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#dcf8c6',
    },
    otherMessage: {
        alignSelf: 'flex-start',
        backgroundColor: 'white',
    },
    botMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#f5ffff',
    },
    messageName: { fontSize: 15, fontWeight: 'bold', color: '#111', marginBottom: 1 },
    messageText: { fontSize: 13, color: '#111', marginRight: 40 },
    timeText: {
        fontSize: 11,
        color: '#555',
        alignSelf: 'flex-end',
        marginTop: -5,
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

});

export default Message;