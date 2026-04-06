const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4efea",
    padding: "24px 16px 40px",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#2b1d15"
  },
  wrapper: {
    maxWidth: "1100px",
    margin: "0 auto",
    background: "#efe9e4",
    minHeight: "92vh",
    padding: "10px 16px 28px"
  },
  brand: {
    textAlign: "center",
    fontSize: "15px",
    letterSpacing: "0.45em",
    color: "#b07a34",
    fontWeight: 700,
    marginTop: "8px",
    marginBottom: "10px"
  },
  title: {
    textAlign: "center",
    fontSize: "20px",
    fontWeight: 500,
    marginBottom: "18px"
  },
  topButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "14px",
    flexWrap: "wrap",
    marginBottom: "20px"
  },
  blackButton: {
    border: "none",
    background: "#000000",
    color: "#ffffff",
    borderRadius: "999px",
    padding: "14px 22px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: 600
  },
  whiteButton: {
    border: "1px solid #cdb99f",
    background: "#f8f5f1",
    color: "#7f6a52",
    borderRadius: "999px",
    padding: "14px 22px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: 600
  },
  helperText: {
    textAlign: "center",
    color: "#9a8571",
    fontSize: "14px",
    marginBottom: "24px"
  },
  previewSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "18px"
  },
  previewFrame: {
    width: "100%",
    maxWidth: "560px",
    background: "#f6f1ec",
    border: "1px solid #dccbb8",
    borderRadius: "22px",
    padding: "10px"
  },
  previewImage: {
    width: "100%",
    borderRadius: "16px",
    display: "block"
  },
  actionRow: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap"
  },
  bottomActionRow: {
    display: "flex",
    justifyContent: "center",
    marginTop: "14px"
  },
  findShadeButton: {
    border: "none",
    background: "#ffffff",
    color: "#1f1a17",
    borderRadius: "14px",
    padding: "16px 22px",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 1px 0 rgba(0,0,0,0.04)"
  },
  smallResetButton: {
    border: "1px solid #d8cabc",
    background: "#f8f5f1",
    color: "#7d6754",
    borderRadius: "8px",
    padding: "8px 14px",
    fontSize: "12px",
    cursor: "pointer",
    fontWeight: 500
  },
  resultShell: {
    marginTop: "18px"
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(120px, 160px) repeat(3, minmax(150px, 190px))",
    gap: "16px",
    justifyContent: "center",
    alignItems: "stretch",
    overflowX: "auto",
    paddingBottom: "8px"
  },
  faceColumn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  faceImageFrame: {
    width: "100%",
    maxWidth: "150px",
    background: "#f9f5f1",
    borderRadius: "18px",
    padding: "4px",
    boxShadow: "0 0 0 1px #ebddd0 inset"
  },
  faceImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "14px",
    display: "block"
  },
  optionCard: {
    minHeight: "360px",
    background: "#f4f1ee",
    borderRadius: "18px",
    padding: "14px 14px 18px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start"
  },
  bestCard: {
    minHeight: "360px",
    background: "#f7f3ef",
    borderRadius: "18px",
    padding: "14px 14px 18px",
    border: "2px solid #cba15a",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start"
  },

  // ✅ FIXED: CENTERED BADGE
  bestBadge: {
    alignSelf: "center",
    background: "#c99240",
    color: "#ffffff",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    padding: "8px 18px",
    marginBottom: "14px",
    letterSpacing: "0.08em",
    textAlign: "center"
  },

  spacerBadge: {
    height: "38px",
    marginBottom: "14px"
  },
  productImageBox: {
    width: "100%",
    height: "180px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ece9e6",
    borderRadius: "8px",
    overflow: "hidden"
  },
  productImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block"
  },
  placeholderImageBox: {
    width: "100%",
    height: "100%",
    background: "#e6e1dc"
  },
  shadeName: {
    marginTop: "16px",
    fontSize: "22px",
    fontWeight: 800,
    color: "#5a3622",
    textAlign: "center"
  },
  shadeLabel: {
    marginTop: "8px",
    fontSize: "12px",
    letterSpacing: "0.18em",
    color: "#c38d46",
    textAlign: "center",
    fontWeight: 700
  },
  errorBox: {
    maxWidth: "640px",
    margin: "18px auto 0",
    background: "#fff1f0",
    border: "1px solid #e6b7b3",
    color: "#8a3732",
    borderRadius: "12px",
    padding: "12px 14px",
    textAlign: "center",
    fontSize: "14px",
    lineHeight: 1.5
  },
  footer: {
    textAlign: "center",
    fontSize: "12px",
    color: "#5d4c40",
    marginTop: "26px"
  },
  cameraOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(20, 16, 13, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px"
  },
  cameraModal: {
    width: "100%",
    maxWidth: "720px",
    background: "#f7f2ec",
    borderRadius: "24px",
    padding: "20px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.18)"
  },
  cameraTitle: {
    textAlign: "center",
    fontSize: "22px",
    fontWeight: 700,
    color: "#4f3424",
    marginBottom: "16px"
  },
  cameraFrame: {
    width: "100%",
    borderRadius: "20px",
    overflow: "hidden",
    background: "#ded7cf",
    minHeight: "320px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  cameraVideo: {
    width: "100%",
    display: "block"
  },
  cameraLoading: {
    color: "#6f5a49",
    fontSize: "16px",
    padding: "30px"
  },
  cameraButtonRow: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginTop: "16px",
    flexWrap: "wrap"
  },
  captureButton: {
    border: "none",
    background: "#111111",
    color: "#ffffff",
    borderRadius: "14px",
    padding: "14px 20px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer"
  },
  cancelButton: {
    border: "1px solid #ccb9a5",
    background: "#fffaf5",
    color: "#6d5949",
    borderRadius: "14px",
    padding: "14px 20px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer"
  }
};
