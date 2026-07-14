import React, { useState, useEffect } from 'react'
import Totals from '../services/Totals'

import TotalsData from '../models/Totals';
import { Col, Row, Container, Table, Spinner, Card } from "react-bootstrap";
import { Aggregate, FetchAlbumsByYearMetric, FetchAlbums, Find, FindAndSort } from '../services/Albums';
import ModalAlbum from '../components/ModalAlbums';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const Dashboard: React.FunctionComponent = () => {
    const [totals, setTotals] = useState<TotalsData>()
    const [totalValue, setTotalValue] = useState<number>(0)
    const [top10Artists, setTop10Artists] = useState<Record<string, number | string>[]>()
    const [albunsByCountry, setAlbunsByCountry] = useState<Record<string, number | string>[]>()
    const [noDiscogs, setNoDiscogs] = useState<Record<string, string>[]>([])
    const [noFixed, setNoFixed] = useState<Record<string, string>[]>([])

    const [showModal, setShowModal] = useState(false);
    const handleCloseModal = () => setShowModal(false);
    const handleShowModal = () => setShowModal(true);

    const [modalValue, setModalValue] = useState<Record<string, string>[]>()
    const [modalYear, setModalYear] = useState<number>()

    useEffect(() => {
        if (totals === undefined) {
            Totals().then((data) => {
                data.media = Object.fromEntries(Object.entries(data.media).sort((a, b) => b[1] - a[1]));
                setTotals(data)
            })
        }
        if (totals !== undefined) {
            let totalValue: number = 0
            Object.keys(totals.media).map(key => {
                totalValue += totals.media[key]
                return totalValue
            })
            setTotalValue(totalValue)
        }
    }, [totals])

    useEffect(() => {
        if (top10Artists === undefined) {
            const query = [
                {
                    "$group": {
                        "_id": "$ARTIST",
                        "total": {
                            "$sum": 1
                        }
                    }
                },
                {
                    "$sort": {
                        "total": -1
                    }
                },
                { "$limit": 20 }
            ]

            Aggregate(query).then((data) => {
                setTop10Artists(data)
            })

        }
    }, [top10Artists])

    useEffect(() => {
        if (albunsByCountry === undefined) {
            const query = [
                {
                    "$group": {
                        "_id": "$ORIGIN",
                        "total": {
                            "$sum": 1
                        }
                    }
                },
                {
                    "$sort": {
                        "total": -1
                    }
                }
            ]

            Aggregate(query).then((data) => {
                setAlbunsByCountry(data)
            })

        }
    })

    useEffect(() => {
        if (noDiscogs.length === 0) {
            Find({ "DISCOGS": { "type": "NOT_FOUND" } }).then((data) => {
                let noDiscogsList: Record<string, string>[] = []
                data.map((album, _) => {
                    return noDiscogsList.push({
                        "title": album.title as string,
                        "artist": album.artist as string,
                        "id": album.id as string,
                    })
                })
                setNoDiscogs(noDiscogsList)
            })
        }
    }, [noDiscogs])

    useEffect(() => {
        if (noFixed.length === 0) {
            FindAndSort({
                "query": {
                    "DISCOGS.len": {
                        "$gt": 1
                    }
                },
                "sort": {
                    "ARTIST": 1
                }
            }).then((data) => {
                let noFixedList: Record<string, string>[] = []
                data.map((album, _) => {
                    return noFixedList.push({
                        "title": album.title as string,
                        "artist": album.artist as string,
                        "id": album.id as string,
                    })
                })
                setNoFixed(noFixedList)
            })
        }
    }, [noFixed])

    const purchaseByYearLabels = Object.keys(totals ? totals.buy : "")
    const purchaseByYear = {
        purchaseByYearLabels,
        datasets: [
            {
                label: 'Compas Por Ano',
                data: totals?.buy,
                backgroundColor: 'blue',
            }
        ],
    };

    const releaseByYearLabels = Object.keys(totals ? totals.year : "")
    const releaseByYear = {
        releaseByYearLabels,
        datasets: [
            {
                label: 'Ano de lançamento',
                data: totals?.year,
                backgroundColor: 'green',
            }
        ],
    };

    const top10ArtistsLabels = top10Artists ? top10Artists.map((artist, _) => artist._id as string) : []
    const top10ArtistsData = top10Artists ? top10Artists.map((artist, _) => artist.total) : []

    return (
        <>
            <Container fluid style={
                {
                    padding: '2rem',
                    height: '100vh',
                    overflowY: 'auto',
                }
            }>
                <Col>
                    <Row>
                        <Col>
                            <h1 style={{ textAlign: 'center' }}>Dashboard</h1>
                        </Col>
                    </Row>
                    <hr style={{ width: '90%', marginLeft: '16px'}}></hr>
                    <br />
                    <Row
                        style={
                            {
                                padding: '2rem',
                                boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
                                borderRadius: '1rem',
                            }
                        }
                        md="auto"
                    >
                        <Col md="auto">
                            <Card style={{
                                width: '100%',
                                height: 'auto',
                                boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
                                borderRadius: '1rem',
                                marginBottom: '2rem'
                            }}
                                key={"totals"}>
                                <Card.Body>
                                    <Card.Title>Total</Card.Title>
                                    <Container>
                                        <Row>
                                            <Col>
                                                <svg width="100" height="100">
                                                    <text x="50" y="55" textAnchor="middle" fontSize="36">{totalValue}</text>
                                                </svg>
                                            </Col>
                                            <Col>
                                                <svg width="100" height="100">
                                                    <circle cx="50" cy="50" r="40" stroke="green" strokeWidth="2" fill="none" />
                                                    <text x="50" y="55" textAnchor="middle" fontSize="16">100%</text>
                                                </svg>
                                            </Col>
                                        </Row>
                                    </Container>
                                </Card.Body>
                            </Card>
                        </Col>
                        {
                            totals ? Object.keys(totals.media).map(key => {
                                return (
                                    <Col key={key + "col"} md="auto">
                                        <Card key={key}
                                            style={{
                                                width: '100%',
                                                height: 'auto',
                                                boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
                                                borderRadius: '1rem',
                                                marginBottom: '2rem'
                                            }}>
                                            <Card.Body>
                                                <Card.Title>{key}</Card.Title>
                                                <Container>
                                                    <Row>
                                                        <Col>
                                                            <svg width="100" height="100">
                                                                <text x="50" y="55" textAnchor="middle" fontSize="36">{totals.media[key]}</text>
                                                            </svg>
                                                        </Col>
                                                        <Col>
                                                            <svg width="100" height="100">
                                                                <circle cx="50" cy="50" r="40" stroke="green" strokeWidth="2" fill="none" />
                                                                <text x="50" y="55" textAnchor="middle" fontSize="16">{(totals.media[key] / totalValue * 100).toFixed(2)}%</text>
                                                            </svg>
                                                        </Col>
                                                    </Row>
                                                </Container>
                                            </Card.Body>
                                        </Card>
                                    </Col>)
                            }) : <Col><Spinner animation="border" /></Col>
                        }
                    </Row>
                    <br />
                    <Row>
                        <Col
                            style={{
                                padding: '2rem',
                                boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
                                borderRadius: '1rem',
                            }}
                        >
                            <h2>Compras por Ano</h2>
                            <Bar data={purchaseByYear} options={{
                                responsive: true,
                                plugins: {
                                    legend: {
                                        position: 'top' as const,
                                    },
                                },
                                onClick: (evt: any, item: any) => {
                                    if (item[0] !== undefined) {
                                        const year = Object.keys(purchaseByYear.datasets[0].data!)[item[0].index]
                                        FetchAlbumsByYearMetric(parseInt(year), "purchase").then((data) => {
                                            setModalYear(parseInt(year))
                                            setModalValue(data)
                                            handleShowModal()
                                        })

                                    }
                                }
                            }} />
                        </Col>
                        <Col
                            style={
                                {
                                    padding: '2rem',
                                    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
                                    borderRadius: '1rem',
                                }
                            }
                        >
                            <h2>Lançamentos por Ano</h2>
                            <Bar data={releaseByYear} options={
                                {
                                    responsive: true,
                                    plugins: {
                                        legend: {
                                            position: 'top' as const,
                                        },
                                    },
                                    onClick: (evt: any, item: any) => {
                                        if (item[0] !== undefined) {
                                            const year = Object.keys(releaseByYear.datasets[0].data!)[item[0].index]
                                            FetchAlbumsByYearMetric(parseInt(year), "release_year").then((data) => {
                                                setModalYear(parseInt(year))
                                                setModalValue(data)
                                                handleShowModal()
                                            })

                                        }
                                    }
                                }
                            } />
                        </Col>
                    </Row>
                    <br />
                    <Row>
                        <Col style={{
                            padding: '2rem',
                            boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
                            borderRadius: '1rem',
                        }} xs={6}>
                            <h2>Top 20 Albuns por Artista</h2>
                            <Bar data={{
                                labels: top10ArtistsLabels,
                                datasets: [
                                    {
                                        label: 'Top 20',
                                        data: top10ArtistsData,
                                        backgroundColor: 'red',
                                    }
                                ],
                            }} options={{
                                responsive: true,
                                plugins: {
                                    legend: {
                                        position: 'top' as const,
                                    },
                                },
                                onClick: (evt: any, item: any) => {
                                    if (item[0] !== undefined) {
                                        const artist = top10ArtistsLabels[item[0].index]
                                        FetchAlbums(artist).then((data) => {
                                            let albumData: Record<string, string>[] = []
                                            data.map((album, _) => {
                                                return albumData.push({
                                                    "title": album.title,
                                                    "artist": album.artist,
                                                    "media": album.media,
                                                    "purchase": album.purchase ? album.purchase.split("T")[0] : "",
                                                    "release": album.releaseYear.toString()
                                                })
                                            })
                                            setModalValue(albumData)
                                            handleShowModal()
                                        })

                                    }
                                }
                            }} />
                        </Col>
                        <Col style={{
                            padding: '2rem',
                            boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
                            borderRadius: '1rem',
                        }} xs={6}>
                            <h2>Albuns por Origem</h2>
                            <Table>
                                <thead>
                                    <tr>
                                        <th>Origem</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        albunsByCountry?.map((country, _) => {
                                            return <tr key={country._id as string}>
                                                <td>{country._id}</td>
                                                <td>{country.total}</td>
                                            </tr>
                                        })
                                    }
                                </tbody>
                            </Table>
                        </Col>
                    </Row>
                    <br />
                    <Row
                        style={
                            {
                                padding: '2rem',
                                boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
                                borderRadius: '1rem',
                            }
                        }
                    >
                        <Col>
                            <h2>Albuns sem Discogs</h2>
                            <Table>
                                <thead>
                                    <tr>
                                        <th>Artista</th>
                                        <th>Album</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        noDiscogs.map((album, _) => {
                                            return <tr key={album.id}>
                                                <td>{album.artist}</td>
                                                <td>{album.title}</td>
                                            </tr>
                                        })
                                    }
                                </tbody>
                            </Table>
                        </Col>
                        <Col>
                            <h2>Albuns sem Fixar</h2>
                            <Table>
                                <thead>
                                    <tr>
                                        <th>Artista</th>
                                        <th>Album</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {
                                        noFixed.map((album, _) => {
                                            return <tr key={album.id}>
                                                <td>{album.artist}</td>
                                                <td>{album.title}</td>
                                            </tr>
                                        })
                                    }
                                </tbody>
                            </Table>
                        </Col>
                    </Row>
                </Col>
            </Container>
            <ModalAlbum
                modalValue={modalValue as Record<string, string>[]}
                showModal={showModal}
                modalYear={modalYear ? modalYear.toString() : ""}
                handleCloseModal={handleCloseModal}
            />
        </>
    )
}

export default Dashboard