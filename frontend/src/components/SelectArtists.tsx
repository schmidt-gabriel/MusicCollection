import Artist from '../models/Artist'
import { ReactSearchAutocomplete } from 'react-search-autocomplete'

const SelectArtist = ({ items, handleSelectArtist, clearContent }: {
    items: Artist[], handleSelectArtist: (item: {
        id: string;
        name: string;
    }) => void, clearContent(): void

}) => {

    return (
        <ReactSearchAutocomplete
            items={items}
            autoFocus
            onSelect={handleSelectArtist}
            styling={
                {
                    height: '50px',
                    borderRadius: '1rem',
                    boxShadow: '0 1px 6px 0 rgba(32,33,36,0.28)',
                    zIndex: 1000
                }
            }
            placeholder='Pesquise o Artista'
            onClear={
                () => {
                    clearContent();
                }
            }
        />
    );
}

export default SelectArtist;