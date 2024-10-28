import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Box, IconButton } from '@mui/joy';
import { PDFDocumentProxy } from 'pdfjs-dist';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import { UploadFileOutlined } from '@mui/icons-material';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.mjs';

type PDFViewerType = {
    pdfUrl: string,
    onUpload: (file: File) => void
}

function PDFViewer({ pdfUrl, onUpload }: PDFViewerType) {
    const [pdf, setPdf] = useState<PDFDocumentProxy>();
    const [pages, setPages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const renderTaskRef = useRef<any>(null);

    const scrollToPage = (pageIndex: number) => {
        const canvas = canvasRefs.current[pageIndex];
        if (canvas) {
            canvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    useEffect(() => {
        const loadPdf = async () => {
            const loadingTask = pdfjsLib.getDocument(pdfUrl);
            const loadedPdf = await loadingTask.promise;
            setPdf(loadedPdf);

            // Generate thumbnails
            const thumbnailPromises = Array.from({ length: loadedPdf.numPages }, async (_, i) => {
                const page = await loadedPdf.getPage(i + 1);
                const viewport = page.getViewport({ scale: 0.2 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const context = canvas.getContext('2d');

                if (context) {
                    await page.render({ canvasContext: context, viewport }).promise;
                }

                return canvas.toDataURL();
            });

            // Update pages state with the generated thumbnails
            const thumbnails = await Promise.all(thumbnailPromises);
            setPages(thumbnails);
        };

        loadPdf();
    }, [pdfUrl]);


    useEffect(() => {
        const renderAllPages = async () => {
            if (pdf) {
                for (let i = 0; i < pdf.numPages; i++) {
                    const page = await pdf.getPage(i + 1);
                    const viewport = page.getViewport({ scale, rotation });
                    const canvas = canvasRefs.current[i];
                    if (canvas) {
                        const context = canvas.getContext('2d');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;

                        // Cancel any ongoing render task for this canvas if it exists
                        if (renderTaskRef.current) {
                            renderTaskRef.current.cancel();
                        }

                        if (context) {
                            // Start a new render task for each page
                            renderTaskRef.current = page.render({ canvasContext: context, viewport });
                            await renderTaskRef.current.promise;
                        }
                    }
                }
            }
        };

        renderAllPages();
    }, [pdf, scale, rotation]);

    const handleZoomIn = () => setScale(prevScale => prevScale + 0.1);
    const handleZoomOut = () => setScale(prevScale => prevScale > 0.1 ? prevScale - 0.1 : prevScale);
    const handleRotateRight = () => setRotation(prevRotation => (prevRotation + 90) % 360);
    const handleRotateLeft = () => setRotation(prevRotation => (prevRotation - 90 + 360) % 360);

    return (
        <Box sx={{ display: 'flex', width: '100%', height: '100vh', bgcolor: 'background.level1' }}>
            <Box sx={{ width: '200px', overflowY: 'auto', p: 2, borderRight: '1px solid #ccc' }}>
                {pages.map((thumbnail, index) => (
                    <Box
                        key={index}
                        component="img"
                        src={thumbnail}
                        alt={`Page ${index + 1}`}
                        sx={{
                            width: '100%',
                            cursor: 'pointer',
                            mb: 2,
                            border: currentPage === index + 1 ? '2px solid' : '1px solid',
                            borderColor: currentPage === index + 1 ? 'primary.main' : 'divider',
                            borderRadius: '4px'
                        }}
                        onClick={() => {
                            setCurrentPage(index + 1);
                            scrollToPage(index); // Scroll to the selected page
                        }}
                    />
                ))}
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 4 }}>
                {Array.from({ length: pdf?.numPages || 0 }, (_, i) => (
                    <canvas
                        key={i}
                        ref={(el) => {
                            canvasRefs.current[i] = el;
                        }}
                        style={{ marginBottom: '24px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', padding: '8px', backgroundColor: '#fff', borderRadius: '4px' }}
                    />
                ))}
            </Box>


            <Box sx={{ position: 'fixed', top: 20, right: 20, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <IconButton onClick={handleZoomIn}><ZoomInIcon /></IconButton>
                <IconButton onClick={handleZoomOut}><ZoomOutIcon /></IconButton>
                <IconButton onClick={handleRotateLeft}><RotateLeftIcon /></IconButton>
                <IconButton onClick={handleRotateRight}><RotateRightIcon /></IconButton>
                <IconButton component="label">
                    <UploadFileOutlined />
                    <input
                        type="file"
                        accept="application/pdf"
                        hidden
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onUpload(file);
                        }}
                    />
                </IconButton>
            </Box>

        </Box>
    );
}

export default PDFViewer;
