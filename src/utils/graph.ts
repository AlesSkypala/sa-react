import { t } from '../locale';
import { generate_graph_id } from '../redux/graphs';
import moment from 'moment-timezone';

type GraphDefaultKeys = 'id' | 'title' | 'xLabel' | 'yLabel' | 'visible' | 'style' | 'traces';

export function graphDefaults(): Pick<Graph, GraphDefaultKeys> {
    return {
        id: generate_graph_id(),
        title:  t('graph.new'),
        xLabel: t('graph.xAxis'),
        yLabel: t('graph.yAxis'),
        visible: true,
        style: {
            margin: 5,
            xLabelSpace: 24,
            yLabelSpace: 60,
        },
        traces: []
    };
}

export function createGraph<T extends XType>(props: Omit<Graph<T>, GraphDefaultKeys> & Partial<Pick<Graph<T>, GraphDefaultKeys>>): Graph<T> {
    return {
        ...graphDefaults(),
        ...props,
    };
}

export function getTitle(sourceType: DataSource['type'], id: Trace['id']) {
    if (sourceType === 'hp') {
        let match;

        if ((match = id.match(/([\w_]+_MPU)-(\d+)$/))) {
            return t(`datasets.titles.hp.${match[1]}`, id, { val: match[2] });
        }
    }

    return t(`datasets.titles.${sourceType}.${id}`, id);
}

export function getTimezones(graph: Graph): { tz: string, text: string }[] {
    if (graph.xType !== 'datetime') return [];

    const sourceTz = graph.metadata.timeZone;
    const localTz = moment.tz.guess();
    const res: { tz: string, text: string }[] = [];

    res.push({ tz: 'UTC', text: 'UTC' });
    if (localTz && localTz !== 'UTC') { res.push({ tz: localTz, text: t('timeZone.local', { tz: localTz }) }); }
    if (sourceTz && sourceTz !== 'UTC' && sourceTz !== localTz) { res.push({ tz: sourceTz, text: t('timeZone.device', { tz: sourceTz }) }); }

    return res;
}
