import { Box, Button } from "@mui/joy";
import { useSearchParams } from "react-router-dom";
import PDFViewer from "../components/PDFViewer";
import { useState } from "react";

function Home() {
    const [searchParams] = useSearchParams();
    const file = searchParams.get("file"); // Get the file from query params
    const [pdfUrl, setPdfUrl] = useState<string | null>(file);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = event.target.files?.[0];
        if (uploadedFile) {
            onUpload(uploadedFile);
        }
    };

    const onUpload = (file: File) => {
        if (file && file.type === 'application/pdf') {
            const fileObjectUrl = URL.createObjectURL(file);
            setPdfUrl(fileObjectUrl);
        } else {
            alert("Please upload a valid PDF file.");
        }
    };

    return (
        <Box>
            {!pdfUrl && <Button variant="outlined" component="label">
                Click here to upload a file
                <input
                    type="file"
                    accept="application/pdf"
                    hidden
                    onChange={handleFileUpload}
                />
            </Button>}
            {pdfUrl && <PDFViewer pdfUrl={pdfUrl} onUpload={onUpload} />}
        </Box>
    );
}

export default Home