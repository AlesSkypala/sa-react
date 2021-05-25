import React from 'react';
import { Bounce, toast, ToastOptions } from 'react-toastify';

class Notifications {

    public notify(message: React.ReactNode, props?: NotificationProps) {

        if (typeof message === 'string') {
            const split = message.split('\n');

            if (split.length > 1) {
                message = (
                    <>
                        {split[0]}
                        {split.slice(1).map((r, i) => (
                            <React.Fragment key={i}>
                                <br/>
                                {r}
                            </React.Fragment>
                        ))}
                    </>
                );
            }
        }

        toast(message, {
            transition: Bounce,
            ...(props ?? {})
        });
    }
}

interface NotificationProps extends ToastOptions {

}

const _Notif = new Notifications();
export default _Notif;