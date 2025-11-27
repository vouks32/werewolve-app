import React, { useState, useEffect } from 'react';
import { FlatList, View, Text, ActivityIndicator, StyleSheet, Image, Dimensions, TouchableOpacity } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { LazyLoadedImage } from './LazyLoadImage';
const { width, height } = Dimensions.get('window')


const MyInfiniteScrollList = ({ contentContainerStyle, onStickerSend, quotingMessage }) => {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true); // To track if there are more items to load
    const { baseUrl, stickers } = useAuth();

    useEffect(() => {
        if (stickers)
            fetchMoreData();
    }, [stickers]); // Fetch initial data on component mount

    const fetchMoreData = async () => {
        if (isLoading || !hasMore) return; // Prevent multiple requests or if no more data

        setIsLoading(true);
        try {
            // Simulate API call
            const newData = await new Promise(resolve => {
                setTimeout(() => {
                    const start = (page - 1) * 12;
                    const end = start + 12;
                    if (start >= stickers?.length) {
                        resolve([])
                        return
                    }
                    const items = stickers?.filter((_, i) => (i >= start && i < end))
                    resolve(items);
                }, 1000);
            });

            if (newData.length === 0) {
                setHasMore(false); // No more data to load
            } else {
                setData(prevData => [...prevData, ...newData]);
                setPage(prevPage => prevPage + 1);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderFooter = () => {
        if (!isLoading) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" />
            </View>
        );
    };

    const renderItem = ({ item }) => (
        <View style={styles.item}>
            <Text>{item.text}</Text>
        </View>
    );

    return (
        <FlatList
            data={data}
            numColumns={4}
            renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { onStickerSend({ id: item.id, quotedMessage: quotingMessage }, null, 'sticker') }}>
                    <LazyLoadedImage
                        source={{ uri: `${baseUrl}/sticker?id=${item.id}.webp` }}
                        style={{ aspectRatio: 1, width: width / 5, borderRadius: 10, margin: 5 }}
                    />
                </TouchableOpacity>
            )}
            keyExtractor={item => item.id}
            onEndReached={fetchMoreData}
            onEndReachedThreshold={0.8} // Trigger when 50% of the list bottom is reached
            ListFooterComponent={renderFooter}
            contentContainerStyle={contentContainerStyle}

        />
    );
};

const styles = StyleSheet.create({
    item: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    footer: {
        paddingVertical: 20,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
    },
});

export default MyInfiniteScrollList;