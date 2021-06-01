
import * as React from 'react';
import { Button, Col, Form, ModalTitle, Row } from 'react-bootstrap';
import { ModalComponent, ModalProps } from '.';
import { t } from '../../locale';
// import { store } from '../../redux';
import { ChromePicker, ChromePickerProps, ColorResult } from 'react-color';

interface Args {
    trace: Trace,
}

interface State {
    title: string,
    color: Trace['style']['color'],
    width: Trace['style']['width'],
}

type Returns = Partial<Omit<Trace, 'style'>> & { style?: Partial<TraceStyle> };

class TraceEditModal
    extends ModalComponent<Returns, Args, State> {

    constructor(props: ModalProps<Returns, Args>) {
        super(props);

        this.state = {
            title: props.trace.title,
            color: props.trace.style.color,
            width: props.trace.style.width,
        };
    }

    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>{t('modals.editTrace.title', { title: this.props.trace.title })}</ModalTitle>
        );
    }

    private onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); this.okClicked(); }
    private onFormChange = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ [e.currentTarget.name]: e.currentTarget.value } as never);
    private onColorChange = (color: ColorResult) => {
        const { r, g, b } = color.rgb;

        this.setState({ color: [ r, g ,b ] });
    }

    protected renderBody(): JSX.Element {

        const { title, color, width } = this.state;

        const styles: ChromePickerProps['styles'] = {
            default: {
                picker: { fontFamily: 'unset' }
            }
        };

        return (
            <Form onSubmit={this.onFormSubmit}>
                <Row>
                    <Col>
                        <Form.Group>
                            <Form.Label>{t('trace.title')}</Form.Label>
                            <Form.Control name='title'  value={title}  onChange={this.onFormChange} />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>{t('trace.width')}</Form.Label>
                            <Form.Control name='width'  value={width}  onChange={this.onFormChange} type='number' min={1} max={8} />
                        </Form.Group>
                    </Col>
                    <Form.Group as={Col}>
                        <Form.Label>{t('trace.color')}</Form.Label>
                        <ChromePicker disableAlpha styles={styles} color={{ r: color[0], g: color[1], b: color[2] }} onChange={this.onColorChange} />
                    </Form.Group>
                </Row>
                <Form.Control type="submit" hidden />
            </Form>
        );
    }
    private okClicked = () => {
        const diff: Returns = {};

        const { title, color, width } = this.state;
        const { trace } = this.props;

        if (title !== trace.title) { diff.title = title; }
        if (color.some((v, i) => trace.style.color[i] !== v)) { diff.style = { color }; }
        if (Number(width) !== trace.style.width) { diff.style = { ...(diff.style ?? {}), width: Number(width) }; }

        this.resolve(Object.keys(diff).length > 0 ? diff : undefined);
    }
    private cancelClicked = () => this.resolve(undefined);
    protected renderFooter(): JSX.Element {
        return (
            <>
                <Button variant='primary' onClick={this.okClicked}>
                    {t('modals.ok')}
                </Button>
                <Button variant='secondary' onClick={this.cancelClicked}>
                    {t('modals.cancel')}
                </Button>
            </>
        );
    }
}

export default TraceEditModal;