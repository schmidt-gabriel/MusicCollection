import { apiFetch } from './Api';
import TotalsData from '../models/Totals';

async function Totals(): Promise<TotalsData> {
    return await apiFetch<TotalsData>('/totals');
}

export default Totals;
