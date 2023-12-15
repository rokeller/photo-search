import { useState } from 'react';
import { PhotoService } from '../services';

interface FilterSettingsProps {
    onClose?: () => void;
}

export function FilterSettings({ onClose }: FilterSettingsProps) {
    const filter = PhotoService.getFilter();
    const [notBefore, setNotBefore] = useState<Date | undefined>(filter?.notBefore);
    const [notAfter, setNotAfter] = useState<Date | undefined>(filter?.notAfter);

    function apply() {
        const filter = {
            notBefore,
            notAfter,
        };
        PhotoService.setFilter(filter);
        close();
    }

    function reset() {
        setNotBefore(undefined);
        setNotAfter(undefined);
    }

    function close() {
        if (onClose) {
            onClose();
        }
    }

    function swapNotBeforeNotAfter() {
        setNotBefore(notAfter);
        setNotAfter(notBefore);
    }

    function onChangeDate(
        setValue: React.Dispatch<React.SetStateAction<Date | undefined>>
    ) {
        return (ev: React.ChangeEvent<HTMLInputElement>) => {
            const local = ev.target.value;
            setValue(new Date(local + 'Z'));
        }
    }

    function makeInputControlDate(dt: Date | undefined) {
        if (dt == undefined) {
            return '';
        }

        try {
            const isoStr = dt.toISOString();
            return isoStr.substring(0, isoStr.length - 1);
        } catch {
            return '';
        }
    }

    return <>
        <div className='subtitle'>Date Filter</div>

        <div className='form-control'>
            <label>
                <div>Not Before</div>
                <input type='datetime-local' value={makeInputControlDate(notBefore)}
                    onChange={onChangeDate(setNotBefore)} />
            </label>
            <div className='pointer clear-btn' title='Clear "Not Before"'
                onClick={() => setNotBefore(undefined)}>✖️</div>
        </div>

        <div className='form-control'>
            <label>
                <div>Not After</div>
                <input type='datetime-local' value={makeInputControlDate(notAfter)}
                    onChange={onChangeDate(setNotAfter)} />
            </label>
            <div className='pointer clear-btn' title='Clear "Not After"'
                onClick={() => setNotAfter(undefined)}>✖️</div>
        </div>
        <div className='buttons'>
            <button disabled={notBefore === undefined && notAfter === undefined}
                onClick={swapNotBeforeNotAfter}>Swap Not Before and Not After</button>
        </div>

        <div className='buttons'>
            <button onClick={apply}>Apply</button>
            {' '}
            <button onClick={reset}>Reset</button>
            {' '}
            <button onClick={close}>Cancel</button>
        </div>
    </>;
}
