
import { useEffect, useState } from 'react';
import { InView } from 'react-intersection-observer';
import { View, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';

export function LazyLoadedImage({ source, style }) {
    const [inView, setInView] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { fetchWithZrok } = useAuth();


    useEffect(() => {
        const fetchImage = async () => {
            try {
                const response = await fetchWithZrok(source.uri); // Replace with your image URL
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const blob = await response.blob();
                const objectURL = URL.createObjectURL(blob);
                setImageUrl(objectURL);
            } catch (e) {
                setError(e);
                console.error("Failed to fetch image:", e);
            } finally {
                setLoading(false);
            }
        };

        if (inView)
            fetchImage();

        // Clean up the object URL when the component unmounts
        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [inView]);

    return (
        <InView onChange={setInView} triggerOnce>
            {inView && imageUrl ? (
                <Image source={imageUrl} style={style} />
            ) : (
                <View style={[style, { backgroundColor: 'lightgray' }]} /> // Placeholder
            )}
        </InView>
    );
}
