import { useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import SignatureCanvas, { type SignatureViewRef } from "react-native-signature-canvas";

type Sig = { base64Data: string } | undefined;

export function SignaturePad({
  onChange,
  label = "Tanda tangan pemilik sasaran di sini",
  initial,
}: {
  onChange: (signature: Sig) => void;
  label?: string;
  initial?: string | null; // base64 tanpa prefix data:
}) {
  const [empty, setEmpty] = useState(!initial);
  const ref = useRef<SignatureViewRef>(null);

  // Footer is hidden via webStyle, so the lib's OK button never fires.
  // Read the data URL ourselves after each stroke ends instead.
  const handleEnd = () => {
    setEmpty(false);
    ref.current?.readSignature();
  };

  const readSignature = (data: string) => {
    if (typeof data === "string" && data.startsWith("data:image")) {
      onChange({ base64Data: data.split(",")[1] });
    }
  };

  const handleEmpty = () => {
    setEmpty(true);
    onChange(undefined);
  };

  return (
    <View style={styles.wrap}>
      <SignatureCanvas
        ref={ref}
        onEnd={handleEnd}
        onOK={readSignature}
        onEmpty={handleEmpty}
        autoClear={false}
        descriptionText=""
        clearText="Hapus"
        confirmText="Simpan"
        webStyle={webStyle}
        dataURL={initial ? `data:image/png;base64,${initial}` : ""}
        // base64 tanpa whitespace → stroke utuh penuh, tidak terpotong saat render
        trimWhitespace={false}
        imageType="image/png"
      />
      {empty ? (
        <View style={styles.placeholder} pointerEvents="none">
          <Text style={styles.placeholderText}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const webStyle = `
  .m-signature-pad { box-shadow: none; border: none; width: 100%; height: 100%; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none; }
  html, body { height: 100%; width: 100%; margin: 0; }
  canvas.signature-pad { width: 100% !important; height: 100% !important; }
`;

const styles = StyleSheet.create({
  wrap: {
    height: 200,
    borderWidth: 1,
    borderColor: "#E4E4E0",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { color: "#71717A", fontSize: 13 },
});
