export interface CancellablePromise<T> {
    then(onResult: (result: T) => void);
    catch(onError: (error: any) => void);
    cancel();
}