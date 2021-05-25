
import * as React from 'react';
import { Button, ModalTitle } from 'react-bootstrap';
import { ModalComponent } from '.';
import { t } from '../../locale';
import { connect } from '../../redux';
import { PendingDataJob } from '../../redux/jobs';

export interface Args {
    id: Graph['id'],
}

class GraphJobsModal extends ModalComponent<boolean, Args> {

    protected renderHeader(): JSX.Element {
        return <ModalTitle>{t('modals.graphJobs.title')}</ModalTitle>;
    }
    protected renderBody(): React.ReactNode {
        return <JobsList id={this.props.id} />;
    }
    private okClicked = () => this.resolve(true);
    protected renderFooter(): JSX.Element {
        return (
            <>
                <Button variant={'primary'} onClick={this.okClicked}>
                    {t('modals.ok')}
                </Button>
            </>
        );
    }
}

const stateProps = (store: RootStore, props: { id: Graph['id'] }) => ({
    running: Object.values(store.jobs.items).filter(j => j.relatedGraphs.includes(props.id) && j.state === 'pending'),
    failed: Object.values(store.jobs.items).filter(j => j.relatedGraphs.includes(props.id) && j.state === 'error'),
});

const dispatchProps = {};

type JobsListProps = {
    id: Graph['id'],

    running: PendingDataJob[],
    failed: PendingDataJob[],
};

class _JobsList extends React.Component<JobsListProps> {
    public render() {
        const { running, failed } = this.props;

        return (
            <div>
                <p>{t('modals.graphJobs.running', { count: running.length })}</p>
                {failed.length > 0 && failed.map(f => (
                    <p key={f.handle.toString()} className='text-danger'>{t('modals.graphJobs.failed', { handle: f.handle })}<br/>{String(f.error)}</p>
                ))}
            </div>
        );
    }
}

const JobsList = connect(stateProps, dispatchProps)(_JobsList);

export default GraphJobsModal;