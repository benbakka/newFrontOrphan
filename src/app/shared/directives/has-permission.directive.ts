import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { PermissionService } from '../../core/services/permission.service';
import { AuthService } from '../../core/services/auth.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route!: string;

  @Input() set appHasPermission(route: string) {
    this.route = route;
    this.updateView();
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private permissionService: PermissionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Listen for permission changes
    this.permissionService.permissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateView();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateView(): void {
    if (!this.route) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    
    // If no user is logged in, hide content
    if (!currentUser) {
      this.viewContainer.clear();
      return;
    }

    // Admin users always have access
    const isAdmin = currentUser.roles && currentUser.roles.includes('ROLE_ADMIN');
    if (isAdmin) {
      this.viewContainer.clear();
      this.viewContainer.createEmbeddedView(this.templateRef);
      return;
    }

    // Check specific permission for non-admin users
    const hasPermission = this.permissionService.hasPermission(this.route);
    
    this.viewContainer.clear();
    if (hasPermission) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
    // If no permission, content remains hidden (viewContainer is cleared)
  }
}
