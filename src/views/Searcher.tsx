import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../redux/store";
import { fetchSession } from "../redux/authSlice";
import axios from "axios";
import { getNetwork } from "../services/ApiGatewayService";
import RegistrationModal from "../components/modals/RegistrationModal";
import PricingModal from "../components/modals/PricingModal";

import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/views/searcher.scss";

const Searcher: React.FC = () => {
    const navigate = useNavigate();
    const dispatch: AppDispatch = useDispatch();
    const { authenticated, status } = useSelector((state: RootState) => state.auth);

    const [searchTerm, setSearchTerm] = useState("");
    const [error, setError] = useState("");
    const [showDelayMessage, setShowDelayMessage] = useState(false);

    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
    const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);

    useEffect(() => {
        if (status === "idle") {
            dispatch(fetchSession());
        }
    }, [dispatch, status]);

    const extractProfileData = (url: string) => {
        if (url.match(/scholar\.google\.[a-z.]+/)) {
            const match = url.match(/[?&]user=([^&]+)/);
            if (match && match[1]) {
                return { author_id: match[1], source: "google" };
            }
        } else if (url.includes("researchgate.net/profile")) {
            const match = url.match(/profile\/([^/]+)/);
            if (match && match[1]) {
                return { author_id: match[1], source: "research_gate" };
            }
        } else {
            // Assume if not Google Scholar or ResearchGate, we pass it to DBLP logic
            return { author_id: url, source: "dblp" };
        }
        return null;
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setShowDelayMessage(false); // Reset the delay message on new search

        if (searchTerm.trim()) {
            const profileData = extractProfileData(searchTerm);
            if (!profileData) {
                setError("Invalid researcher profile URL.");
                return;
            }

            // Start a timer that will display the delay message after 1 second
            const delayTimer = setTimeout(() => {
                setShowDelayMessage(true);
            }, 1000);

            try {
                const response = await getNetwork(authenticated, profileData.author_id, profileData.source, 1);
                clearTimeout(delayTimer);
                setShowDelayMessage(false);
                navigate("/network", { state: { networkData: response } });
            } catch (error) {
                clearTimeout(delayTimer);
                setShowDelayMessage(false);
                if (axios.isAxiosError(error) && error.response) {
                    if (error.response.status === 429 && !authenticated) {
                        setIsRegistrationModalOpen(true);
                        return;
                    }
                    if (error.response.status === 409 && authenticated) {
                        setIsPricingModalOpen(true);
                        return;
                    }
                }
                setError("The service is unavailable. Please try later");
            }
        } else {
            setError("Enter a valid researcher name or profile URL.");
        }
    };

    return (
        <div className="search-page">
            <header className="search-header">
                <div className="title-container">
                    <h1 className="title">
                        <span className="title-linked">Linked</span>
                        <span className="title-scholar">Scholar</span>
                    </h1>
                    <span className="version-text">v0.5</span>
                </div>
                <p className="search-info">Find and analyze researcher networks with ease.</p>
            </header>

            <form onSubmit={handleSearch} className="mb-3 search-container">
                <div className="search-bar">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search for researchers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </form>

            <div className="search-buttons">
                <button type="submit" className="search-button" onClick={handleSearch}>
                    Search
                </button>
                <button type="button" className="search-button-secondary" onClick={() => setSearchTerm("")}>
                    Clear
                </button>
            </div>

            {error && <p className="error-message">{error}</p>}
            {showDelayMessage && (
                <div className="delay-message">
                    <p>We haven't found the researcher in our database.</p>
                    <p>We are building its network, please wait...</p>
                </div>
            )}

            <RegistrationModal isOpen={isRegistrationModalOpen} onClose={() => setIsRegistrationModalOpen(false)} />
            <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
        </div>
    );
};

export default Searcher;
