import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import SignatureCanvas from "react-native-signature-canvas";

export function SignaturePad({ onChange }: { onChange: (signature: { base64Data: string } | undefined) => void }) {
  const [empty, setEmpty] = useState(true);

  const handleEnd = () => {
    setEmpty(false);
  };

  const readSignature = (e: any) => {
    const data = typeof e === "string" ? e : e.nativeEvent.data;
    if (typeof data === "string" && data.startsWith("data:image")) {
      const base64Data = data.split(",")[1];
      onChange({ base64Data });
    }
  };

  const handleEmpty = () => {
    setEmpty(true);
    onChange(undefined);
  };

  return (
    <View style={styles.wrap}>
      <SignatureCanvas
        onEnd={handleEnd}
        onOK={readSignature as any}
        onEmpty={handleEmpty}
        autoClear={false}
        descriptionText=""
        clearText="Hapus"
        confirmText="Simpan"
        webStyle={webStyle}
      />
      {empty ? (
        <View style={styles.placeholder} pointerEvents="none">
          <Text style={styles.placeholderText}>Tanda tangan pemilik sasaran di sini</Text>
        </View>
      ) : null}
    </View>
  );
}

const webStyle = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none; }
  body, html { height: 100%; }
`;

const styles = StyleSheet.create({
  wrap: {
    height: 160,
    borderWidth: 1,
    borderColor: "#ECE7E1",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: "#8A8580", fontSize: 13 },
});
