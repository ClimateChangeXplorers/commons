import React, { PureComponent } from 'react'
import queryString from 'query-string'
import { History, Location } from 'history'
import { Logger } from '@oceanprotocol/squid'
import Spinner from '../components/atoms/Spinner'
import Route from '../components/templates/Route'
import { User } from '../context'
import Asset from '../components/molecules/Asset'
import Pagination from '../components/molecules/Pagination'
import styles from './Search.module.scss'
import Content from '../components/atoms/Content'

interface SearchProps {
    location: Location
    history: History
}

interface SearchState {
    results: any[]
    totalResults: number
    offset: number
    totalPages: number
    currentPage: number
    isLoading: boolean
    searchTerm: string
    searchCategories: string
}

export default class Search extends PureComponent<SearchProps, SearchState> {
    public state = {
        results: [],
        totalResults: 0,
        offset: 25,
        totalPages: 1,
        currentPage: 1,
        isLoading: true,
        searchTerm: '',
        searchCategories: ''
    }

    public async componentDidMount() {
        const { search } = this.props.location
        const { text, page, categories } = queryString.parse(search)

        if (text) {
            await this.setState({
                searchTerm: encodeURIComponent(`${text}`)
            })
        }

        if (categories) {
            await this.setState({
                searchCategories: encodeURIComponent(`${categories}`)
            })
        }

        // switch to respective page if query string is present
        if (page) {
            const currentPage = Number(page)
            await this.setState({ currentPage })
        }

        this.searchAssets()
    }

    private searchAssets = async () => {
        const { ocean } = this.context
        const { offset, currentPage, searchTerm, searchCategories } = this.state

        const queryValues =
            searchCategories !== '' && searchTerm !== ''
                ? { text: [searchTerm], categories: [searchCategories] }
                : searchCategories !== '' && searchTerm === ''
                ? { categories: [searchCategories] }
                : { text: [searchTerm] }

        const searchQuery = {
            offset,
            page: currentPage,
            query: {
                ...queryValues,
                price: [-1, 1]
            },
            sort: {
                datePublished: 1
            }
        }

        try {
            const search = await ocean.aquarius.queryMetadata(searchQuery)
            this.setState({
                results: search.results,
                totalResults: search.totalResults,
                totalPages: search.totalPages,
                isLoading: false
            })
        } catch (error) {
            Logger.error(error.message)
            this.setState({ isLoading: false })
        }
    }

    private handlePageClick = async (data: { selected: number }) => {
        // react-pagination starts counting at 0, we start at 1
        let toPage = data.selected + 1

        this.props.history.push({
            pathname: this.props.location.pathname,
            search: `?text=${this.state.searchTerm}&page=${toPage}`
        })

        await this.setState({ currentPage: toPage, isLoading: true })
        await this.searchAssets()
    }

    public renderResults = () =>
        this.state.isLoading ? (
            <Spinner message="Searching..." />
        ) : this.state.results && this.state.results.length ? (
            <div className={styles.results}>
                {this.state.results.map((asset: any) => (
                    <Asset key={asset.id} asset={asset} />
                ))}
            </div>
        ) : (
            <div>No data sets found.</div>
        )

    public render() {
        const { totalResults, totalPages, currentPage } = this.state

        return (
            <Route title="Search" wide>
                <Content wide>
                    {totalResults > 0 && (
                        <h2
                            className={styles.resultsTitle}
                            dangerouslySetInnerHTML={{
                                __html: `${totalResults} results for <span>${decodeURIComponent(
                                    this.state.searchTerm ||
                                        this.state.searchCategories
                                )}</span>`
                            }}
                        />
                    )}
                    {this.renderResults()}

                    <Pagination
                        totalPages={totalPages}
                        currentPage={currentPage}
                        handlePageClick={this.handlePageClick}
                    />
                </Content>
            </Route>
        )
    }
}

Search.contextType = User
