import { TestBed } from '@angular/core/testing';
import { take, toArray } from 'rxjs/operators';
import { ToastMessage, ToastService } from '../services/toast.service';

describe('ToastService', () => {
    let svc: ToastService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ToastService],
        });
        svc = TestBed.inject(ToastService);
    });

    it('emits messages via helpers and show()', (done) => {
        const messages: ToastMessage[] = [
            { level: 'info', text: 'hello' },
            { level: 'warning', text: 'careful' },
            { level: 'error', text: 'fail' },
            { level: 'success', text: 'nice' },
        ];

        svc.toast$
            .pipe(take(messages.length), toArray())
            .subscribe((emitted) => {
                expect(emitted).toEqual(messages);
                done();
            });

        svc.info('hello');
        svc.warning('careful');
        svc.error('fail');
        svc.success('nice');
    });

    it('supports the generic show method', (done) => {
        svc.toast$.pipe(take(1)).subscribe((msg) => {
            expect(msg).toEqual({ level: 'info', text: 'custom' });
            done();
        });

        svc.show({ level: 'info', text: 'custom' });
    });
});
