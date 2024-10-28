import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Box, IconButton, Typography } from '@mui/joy';
import { PDFDocumentProxy } from 'pdfjs-dist';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import { SaveAltOutlined, UploadFileOutlined } from '@mui/icons-material';
import Checkbox from '@mui/joy/Checkbox';
import { degrees, PDFDocument } from 'pdf-lib';
import axios from 'axios';
import { useParams } from 'react-router-dom';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.mjs';

function PDFViewer() {
    const [pdf, setPdf] = useState<PDFDocumentProxy>();
    const [pages, setPages] = useState<string[]>([]);
    const [scale, setScale] = useState(1);
    const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const [selectedPages, setSelectedPages] = useState<number[]>([]);
    const [rotations, setRotations] = useState<{ [pageIndex: number]: number }>({});
    const [originalFile, setOriginalFile] = useState<File | null>(null);
    const { id } = useParams<{ id: string }>();

    const scrollToPage = (pageIndex: number) => {
        const canvas = canvasRefs.current[pageIndex];
        if (canvas) {
            canvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const togglePageSelection = (pageIndex: number) => {
        setSelectedPages((prevSelected) => {
            if (prevSelected.includes(pageIndex)) {
                return prevSelected.filter((index) => index !== pageIndex);
            } else {
                return [...prevSelected, pageIndex];
            }
        });
    };

    const renderPage = async (pageNum: number, canvas: HTMLCanvasElement | null, rotationAngle: number, scaleValue: number) => {
        if (pdf && canvas) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: scaleValue, rotation: rotationAngle });
            const context = canvas.getContext('2d');

            context?.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            if (context) {
                const renderTask = page.render({ canvasContext: context, viewport });
                await renderTask.promise;
            }
        }
    };

    useEffect(() => {
        if (id) {
            fetchAndRenderPdf(id);
        }
    }, [id]);

    const fetchAndRenderPdf = async (id: string) => {
        try {
            const response = await axios.get(`http://localhost:3000/download/${id}`, {
                responseType: 'blob',
            });
            const file = new File([response.data], 'downloaded.pdf', { type: 'application/pdf' });

            setOriginalFile(file);
            const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
            const loadedPdf = await loadingTask.promise;
            setPdf(loadedPdf);

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
            const thumbnails = await Promise.all(thumbnailPromises);
            setPages(thumbnails);
        } catch (error) {
            console.error("Failed to fetch PDF:", error);
        }
    };

    useEffect(() => {
        const renderAllPages = async () => {
            if (pdf) {
                for (let i = 0; i < pdf.numPages; i++) {
                    const canvas = canvasRefs.current[i];
                    const rotationAngle = rotations[i] || 0;
                    renderPage(i + 1, canvas, rotationAngle, scale);
                }
            }
        };

        renderAllPages();
    }, [pdf, scale, rotations]);

    const handleZoomIn = () => setScale(prevScale => Math.min(prevScale + 0.1, 2));
    const handleZoomOut = () => setScale(prevScale => Math.max(prevScale - 0.1, 0.1));
    const renderThumbnail = async (pageNum: number, rotationAngle: number) => {
        if (!pdf) return;

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.2, rotation: rotationAngle });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            const thumbnailDataUrl = canvas.toDataURL();

            // Update the pages state with the new rotated thumbnail
            setPages((prevPages) => {
                const updatedPages = [...prevPages];
                updatedPages[pageNum - 1] = thumbnailDataUrl;
                return updatedPages;
            });
        }
    };

    const handleRotateRight = () => {
        setRotations((prevRotations) => {
            const newRotations = { ...prevRotations };
            if (selectedPages.length > 0) {
                selectedPages.forEach((pageIndex) => {
                    newRotations[pageIndex] = (newRotations[pageIndex] || 0) + 90;
                    renderPage(pageIndex + 1, canvasRefs.current[pageIndex], newRotations[pageIndex], scale);
                    renderThumbnail(pageIndex + 1, newRotations[pageIndex]); // Update thumbnail
                });
            } else {
                if (pdf?.numPages) {
                    for (let i = 0; i < pdf?.numPages; i++) {
                        newRotations[i] = (newRotations[i] || 0) + 90;
                        renderPage(i + 1, canvasRefs.current[i], newRotations[i], scale);
                        renderThumbnail(i + 1, newRotations[i]); // Update thumbnail
                    }
                }
            }
            return newRotations;
        });
    };

    const handleRotateLeft = () => {
        setRotations((prevRotations) => {
            const newRotations = { ...prevRotations };
            if (selectedPages.length > 0) {
                selectedPages.forEach((pageIndex) => {
                    newRotations[pageIndex] = (newRotations[pageIndex] || 0) - 90;
                    renderPage(pageIndex + 1, canvasRefs.current[pageIndex], newRotations[pageIndex], scale);
                    renderThumbnail(pageIndex + 1, newRotations[pageIndex]);
                });
            } else {
                if (pdf?.numPages) {
                    for (let i = 0; i < pdf?.numPages; i++) {
                        newRotations[i] = (newRotations[i] || 0) - 90;
                        renderPage(i + 1, canvasRefs.current[i], newRotations[i], scale);
                        renderThumbnail(i + 1, newRotations[i]);
                    }
                }
            }
            return newRotations;
        });
    };

    const uploadToServer = async (fileBlob: Blob,) => {
        const formData = new FormData();
        formData.append('pdfFile', fileBlob, 'rotated_and_scaled.pdf');
        if (id) formData.append('id', id);

        try {
            const response = await axios.post(`http://localhost:3000/upload?id=${id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            alert(`File uploaded successfully: ${response.data.filePath}`);
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("Failed to upload the file.");
        }
    };


    const saveFile = async () => {
        if (!pdf || !originalFile) return alert("No PDF loaded!");

        // Create a new PDF document
        const pdfDoc = await PDFDocument.create();
        const originalBuffer = await originalFile.arrayBuffer();
        const existingPdfDoc = await PDFDocument.load(originalBuffer);

        for (let i = 0; i < existingPdfDoc.getPageCount(); i++) {
            const [copiedPage] = await pdfDoc.copyPages(existingPdfDoc, [i]);
            pdfDoc.addPage(copiedPage);

            const rotationAngle = rotations[i] || 0;
            copiedPage.setRotation(degrees(rotationAngle));
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });

        // Call the uploadToServer function to upload the saved file to the server
        await uploadToServer(blob);

        // // Trigger download for user as well, if needed
        // const link = document.createElement("a");
        // link.href = URL.createObjectURL(blob);
        // link.download = "rotated_and_scaled.pdf";
        // link.click();
    };

    return (
        <Box sx={{ display: 'flex', width: '100%', height: '100vh', bgcolor: 'background.level1' }}>
            {originalFile && <>
                <Box sx={{ width: '200px', overflowY: 'auto', p: 2, borderRight: '1px solid #ccc' }}>
                    {pages.map((thumbnail, index) => (
                        <Box
                            key={index}
                            sx={{ mb: 2, textAlign: 'center', position: 'relative' }}
                            onClick={() => scrollToPage(index)}
                        >
                            <Box
                                component="img"
                                src={thumbnail}
                                alt={`Page ${index + 1}`}
                                sx={{
                                    width: '100%',
                                    cursor: 'pointer',
                                    border: selectedPages.includes(index) ? '2px solid' : '1px solid',
                                    borderColor: selectedPages.includes(index) ? 'primary.main' : 'divider',
                                    borderRadius: '4px',
                                }}
                            />
                            <Checkbox size="lg"
                                checked={selectedPages.includes(index)}
                                onChange={() => togglePageSelection(index)}
                            />
                            <Box component="p" sx={{ mt: 1, fontSize: '12px', color: 'text.secondary' }}>
                                {index + 1}
                            </Box>
                        </Box>
                    ))}
                </Box>

                <Box sx={{ flex: 1, overflowY: 'auto', p: 4 }}>
                    {Array.from({ length: pdf?.numPages || 0 }, (_, i) => (
                        <Box
                            key={i}
                            sx={{
                                position: 'relative',
                                mb: 4,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                padding: '8px',
                                backgroundColor: '#fff',
                                borderRadius: '4px',
                            }}
                        >
                            <canvas
                                ref={(el) => {
                                    canvasRefs.current[i] = el;
                                }}
                                style={{
                                    borderRadius: '4px'
                                }}
                            />
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: '8px',
                                    right: '8px',
                                }}
                            >
                                <Checkbox
                                    checked={selectedPages.includes(i)}
                                    onChange={() => togglePageSelection(i)}
                                    size="lg"
                                />
                            </Box>
                        </Box>
                    ))}
                </Box>

            </>}

            <Box sx={{ position: 'fixed', top: 20, right: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                {originalFile &&

                    <>
                        <IconButton onClick={saveFile}><SaveAltOutlined /></IconButton>
                        <IconButton onClick={handleZoomIn}><ZoomInIcon /></IconButton>

                        <Typography sx={{ fontSize: '14px', fontWeight: 'bold' }}>
                            {Math.round(scale * 100)}%
                        </Typography>

                        <IconButton onClick={handleZoomOut}><ZoomOutIcon /></IconButton>

                        <IconButton onClick={handleRotateRight}><RotateRightIcon /></IconButton>
                        <IconButton onClick={handleRotateLeft}><RotateLeftIcon /></IconButton></>
                }
                <IconButton component="label" color='success' size='lg' variant='outlined'>
                    <UploadFileOutlined />
                    <input
                        type="file"
                        accept="application/pdf"
                        hidden
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                setOriginalFile(file); // Update the original file here

                                // Load the PDF document after setting the original file
                                const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
                                const loadedPdf = await loadingTask.promise;
                                setPdf(loadedPdf);
                                // Load the thumbnails
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
                                const thumbnails = await Promise.all(thumbnailPromises);
                                setPages(thumbnails);
                            }
                        }}
                    />

                </IconButton>
            </Box>
        </Box>
    );
}


export default PDFViewer;
