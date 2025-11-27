import React from "react";
import { Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function MessageFormatter({ message }) {
  // Découper le message par lignes
  const fontSize = 14;
  const lines = message.split("\n");
  const { allUsers } = useAuth();

  // Fonction pour formater une seule ligne
  const formatLine = (line) => {
    // Si c'est une ligne de liste
    if (line.startsWith("- ")) {
      return (
        <View style={{ flexDirection: "row" }}>
          <Text style={{ fontSize: fontSize }}>• </Text>
          <Text style={{ fontSize: fontSize }}>
            {renderStyledText(line.substring(2))}
          </Text>
        </View>
      );
    }

    return (
      <Text style={{ fontSize: fontSize }}>
        {renderStyledText(line)}
      </Text>
    );
  };

  // Fonction qui applique gras / italique
  const renderStyledText = (text) => {
    const parts = [];
    let regex = /(\*[^*]+\*|_[^_]+_)/g;
    let lastIndex = 0;

    text.replace(regex, (match, p1, offset) => {
      if (offset > lastIndex) {
        parts.push({
          text: text.slice(lastIndex, offset),
          style: {},
        });
      }

      if (match.startsWith("*")) {
        parts.push({
          text: match.slice(1, -1),
          style: { fontWeight: "bold" },
        });
      } else if (match.startsWith("_")) {
        parts.push({
          text: match.slice(1, -1),
          style: { fontStyle: "italic" },
        });
      }

      lastIndex = offset + match.length;
    });

    if (lastIndex < text.length) {
      parts.push({
        text: text.slice(lastIndex),
        style: {},
      });
    }

    return parts.map((p, i) => (
      <Text key={i} style={p.style}>
        {replaceMentionsWithName(p.text)}
      </Text>
    ));
  };

  const replaceMentionsWithName = (text) => {
    const regex = /@\w+/g; // Recherche des mentions
    return text.replace(regex, (match) => {
      const user = allUsers.find((user) => user.number === match.substring(1));
      return user ? user.username : match;
    });
  }

  return (
    <View style={{ padding: 0 }}>
      {lines.map((line, index) => (
        <View key={index} style={{ marginBottom: 2 }}>
          {formatLine(line)}
        </View>
      ))}
    </View>
  );
}
