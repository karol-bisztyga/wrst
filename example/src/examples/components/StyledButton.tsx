import { Button, Text } from "wrst";

type StyledButtonProps = {
  width?: number;
  height?: number;
  label: string;
  onPress: () => void;
};

export const StyledButton = ({
  width,
  height,
  label,
  onPress,
}: StyledButtonProps) => {
  return (
    <Button
      onPress={onPress}
      style={{
        width: width || 120,
        height: height || 36,
        backgroundColor: "rgb(83, 69, 189)",

        verticalAlignment: "center",
        borderRadius: 8,
      }}
    >
      <Text
        style={{
          width: "fill",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Button>
  );
};
