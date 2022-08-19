export interface INotifications {
	info(header: string, body: string, actions?: INotificationAction[]): INotification;
	warn(header: string, body: string, actions?: INotificationAction[]): INotification;
	error(header: string, body: string, actions?: INotificationAction[]): INotification;
	success(header: string, body: string, actions?: INotificationAction[]): INotification;
	denied(header: string, body: string, actions?: INotificationAction[]): INotification;
}

/**
 * An action related to a notification
 */
export interface INotificationAction {
	/**
	 * Button text for action
	 */
	text: string;
	/**
	 * The implementation of the action
	 * @param removeNotif - Call this to remove the notification, equivalent to {@link INotification.remove}
	 */
	callback(removeNotif: () => void): void;
}

/**
 * Notification handle returned by methods in INotifications
 */
export interface INotification {
	/**
	 * Remove the notification
	 */
	remove(): void;
}
